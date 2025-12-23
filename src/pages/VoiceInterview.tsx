import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useBodyLanguageAnalysis } from '@/hooks/useBodyLanguageAnalysis';
import { useCheatingDetection } from '@/hooks/useCheatingDetection';
import BodyLanguageCoach from '@/components/BodyLanguageCoach';
import { CheatingAlert, CheatingAlertCompact } from '@/components/CheatingAlert';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  AlertTriangle,
  Volume2,
  Loader2,
  Sparkles,
  MessageSquare,
  Eye,
  Clock,
  Activity,
  Shield,
  Settings,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// SpeechRecognition types for browser API
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
}

interface SpeechRecognitionResultListCustom {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventCustom extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListCustom;
}

interface SpeechRecognitionErrorEventCustom extends Event {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventCustom) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventCustom) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const VoiceInterview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Interview state
  const [isStarted, setIsStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  // Audio state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Video state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  
  // Voice settings
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  // Metrics
  const [duration, setDuration] = useState(0);
  const [lookAwayCount, setLookAwayCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Body language analysis
  const { 
    isAnalyzing: isBodyAnalyzing, 
    metrics: bodyMetrics, 
    startAnalysis: startBodyAnalysis,
    stopAnalysis: stopBodyAnalysis 
  } = useBodyLanguageAnalysis(videoRef.current);

  // Cheating detection
  const {
    metrics: cheatingMetrics,
    updateEyeContact,
    updatePersonDetection,
    resetMetrics: resetCheatingMetrics,
  } = useCheatingDetection({
    eyeContactThreshold: 40,
    lookAwayDurationMs: 2000,
    onViolation: (event) => {
      // Show toast for violations
      if (event.type === 'tab_switch') {
        toast({
          variant: 'destructive',
          title: 'Tab Switch Detected',
          description: 'Please stay on the interview tab.',
        });
      }
    },
  });

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter to English voices and sort by name
      const englishVoices = voices
        .filter(voice => voice.lang.startsWith('en'))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAvailableVoices(englishVoices);
      
      // Set default voice if not selected
      if (!selectedVoiceUri && englishVoices.length > 0) {
        // Prefer Google voices, then any US English
        const preferredVoice = englishVoices.find(v => v.name.includes('Google')) 
          || englishVoices.find(v => v.lang === 'en-US')
          || englishVoices[0];
        if (preferredVoice) {
          setSelectedVoiceUri(preferredVoice.voiceURI);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceUri]);

  // Sync body language metrics with cheating detection
  useEffect(() => {
    if (isBodyAnalyzing) {
      updateEyeContact(bodyMetrics.eyeContactScore);
      // Simple person detection based on posture score (if 0, person not detected)
      updatePersonDetection(bodyMetrics.postureScore > 20);
    }
  }, [isBodyAnalyzing, bodyMetrics.eyeContactScore, bodyMetrics.postureScore, updateEyeContact, updatePersonDetection]);

  // Initialize video stream and body language analysis
  useEffect(() => {
    if (isStarted && videoEnabled) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Start body language analysis after video is ready
            videoRef.current.onloadedmetadata = () => {
              startBodyAnalysis();
            };
          }
        })
        .catch((err) => {
          console.error('Camera error:', err);
          toast({
            variant: 'destructive',
            title: 'Camera Access Required',
            description: 'Please enable camera access for the interview.',
          });
        });
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      stopBodyAnalysis();
    };
  }, [isStarted, videoEnabled, startBodyAnalysis, stopBodyAnalysis, toast]);

  // Duration timer
  useEffect(() => {
    if (isStarted) {
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isStarted]);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Speech recognition is not supported in your browser. Try Chrome.',
      });
      return null;
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEventCustom) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setCurrentTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        handleUserMessage(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventCustom) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListening && !isSpeaking && !isProcessing) {
        recognition.start();
      }
    };

    return recognition;
  }, [isListening, isSpeaking, isProcessing, toast]);

  // Start interview
  const startInterview = async () => {
    setIsConnecting(true);
    
    try {
      // Get initial AI response
      const { data, error } = await supabase.functions.invoke('interview-chat', {
        body: { isStart: true, messages: [] }
      });

      if (error) throw error;

      const aiMessage: Message = { role: 'assistant', content: data.response };
      setMessages([aiMessage]);
      setQuestionCount(1);
      setIsStarted(true);
      
      // Play AI response
      await playAudioResponse(data.response);

      // Initialize and start listening
      const recognition = initSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      }

    } catch (error) {
      console.error('Failed to start interview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not start the interview.';
      toast({
        variant: 'destructive',
        title: 'Failed to Start',
        description: errorMessage,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle user message
  const handleUserMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setCurrentTranscript('');
    
    // Stop listening while processing
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const { data, error } = await supabase.functions.invoke('interview-chat', {
        body: { messages: updatedMessages, isStart: false }
      });

      if (error) throw error;

      const aiMessage: Message = { role: 'assistant', content: data.response };
      setMessages([...updatedMessages, aiMessage]);
      setQuestionCount(prev => prev + 1);
      
      // Play AI response
      await playAudioResponse(data.response);

      // Resume listening
      if (recognitionRef.current && micEnabled) {
        recognitionRef.current.start();
        setIsListening(true);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      
      // Resume listening on error
      if (recognitionRef.current && micEnabled) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Play audio response using browser's built-in Web Speech API (free)
  const playAudioResponse = async (text: string) => {
    setIsSpeaking(true);

    try {
      // Check if speech synthesis is available
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        setIsSpeaking(false);
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Use selected voice or find a good default
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceUri);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        // Fallback to first English voice
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
      
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.volume = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  // Preview selected voice
  const previewVoice = () => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hello, I'll be your interviewer today. Let's get started.");
    
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceUri);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  // End interview
  const endInterview = async () => {
    // Stop all media
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    stopBodyAnalysis();

    // Calculate combined score including body language
    const bodyScore = bodyMetrics.overallScore;
    const combinedScore = Math.round((bodyScore * 0.3) + (Math.max(5, 10 - lookAwayCount * 0.5) * 10 * 0.7));

    // Save session to database
    if (user) {
      try {
        const { error } = await supabase.from('interview_sessions').insert({
          user_id: user.id,
          session_type: 'voice',
          status: 'completed',
          duration_minutes: Math.ceil(duration / 60),
          started_at: new Date(Date.now() - duration * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          overall_score: combinedScore / 10,
        });

        if (error) console.error('Failed to save session:', error);
      } catch (err) {
        console.error('Session save error:', err);
      }
    }

    toast({
      title: 'Interview Ended',
      description: `Great job! You answered ${questionCount} questions in ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}.`,
    });

    navigate('/dashboard');
  };

  // Toggle microphone
  const toggleMic = () => {
    if (micEnabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
    setMicEnabled(!micEnabled);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pre-interview screen
  if (!isStarted) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center animate-fade-in">
        <div className="glass rounded-3xl p-12 max-w-2xl text-center space-y-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-magenta to-primary mx-auto flex items-center justify-center shadow-glow-magenta">
            <Video className="w-10 h-10 text-primary-foreground" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-foreground mb-3">AI Voice Interview</h1>
            <p className="text-muted-foreground">
              Experience a realistic stress interview with our AI interviewer. 
              The AI will challenge your answers and press for details, just like a real interview.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="glass rounded-xl p-4">
              <Mic className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">Voice Input</p>
              <p className="text-xs text-muted-foreground">Speak naturally</p>
            </div>
            <div className="glass rounded-xl p-4">
              <Volume2 className="w-6 h-6 text-neon-magenta mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">AI Voice</p>
              <p className="text-xs text-muted-foreground">Realistic responses</p>
            </div>
            <div className="glass rounded-xl p-4">
              <Eye className="w-6 h-6 text-neon-purple mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">Video Analysis</p>
              <p className="text-xs text-muted-foreground">Body language</p>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="glass rounded-xl p-4 text-left">
            <button 
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="w-full flex items-center justify-between text-foreground"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-neon-cyan" />
                <span className="font-medium">Voice Settings</span>
              </div>
              <span className="text-muted-foreground text-sm">
                {showVoiceSettings ? 'Hide' : 'Customize'}
              </span>
            </button>

            {showVoiceSettings && (
              <div className="mt-4 space-y-4 animate-fade-in">
                {/* Voice Selection */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Interviewer Voice
                  </label>
                  <div className="flex gap-2">
                    <Select 
                      value={selectedVoiceUri} 
                      onValueChange={setSelectedVoiceUri}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {availableVoices.map((voice) => (
                          <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="glass" 
                      size="icon"
                      onClick={previewVoice}
                      title="Preview voice"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Speech Rate */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label className="text-muted-foreground">Speech Rate</label>
                    <span className="text-foreground font-mono">{speechRate.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speechRate]}
                    onValueChange={([value]) => setSpeechRate(value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Pitch */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label className="text-muted-foreground">Pitch</label>
                    <span className="text-foreground font-mono">{speechPitch.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[speechPitch]}
                    onValueChange={([value]) => setSpeechPitch(value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Prepare for a Challenge</p>
              <p className="text-xs text-muted-foreground">
                This is a stress interview simulation. The AI will be skeptical and press for details. 
                Stay calm and answer confidently!
              </p>
            </div>
          </div>

          <Button
            variant="hero"
            size="xl"
            onClick={startInterview}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start Interview
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Active interview screen
  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-neon-cyan" />
            <span className="font-mono text-foreground">{formatDuration(duration)}</span>
          </div>
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-neon-purple" />
            <span className="text-foreground">{questionCount} questions</span>
          </div>
          {isBodyAnalyzing && (
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-green" />
              <span className="text-foreground font-mono">{bodyMetrics.overallScore}%</span>
            </div>
          )}
          {/* Cheating Detection Indicator */}
          <CheatingAlertCompact metrics={cheatingMetrics} />
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-neon-green animate-pulse" />
              <span className="text-sm text-foreground">AI Speaking</span>
            </div>
          )}
          {isListening && (
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
              <Mic className="w-4 h-4 text-neon-cyan animate-pulse" />
              <span className="text-sm text-foreground">Listening</span>
            </div>
          )}
          {/* Integrity Status */}
          <div className={cn(
            "glass rounded-xl px-4 py-2 flex items-center gap-2",
            cheatingMetrics.suspicionLevel === 'high' && 'border-destructive/50',
            cheatingMetrics.suspicionLevel === 'medium' && 'border-warning/50'
          )}>
            <Shield className={cn(
              "w-4 h-4",
              cheatingMetrics.suspicionLevel === 'low' ? 'text-neon-green' :
              cheatingMetrics.suspicionLevel === 'medium' ? 'text-warning' : 'text-destructive'
            )} />
            <span className="text-sm text-foreground capitalize">{cheatingMetrics.suspicionLevel}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Video Feed */}
        <div className="lg:col-span-2 glass rounded-2xl overflow-hidden relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Body language feedback overlay */}
          {isBodyAnalyzing && bodyMetrics.feedback[0] && bodyMetrics.feedback[0] !== 'Great body language! Keep it up' && (
            <div className="absolute top-4 left-4 right-4 glass rounded-xl px-4 py-2 border border-warning/30 bg-warning/10">
              <p className="text-sm text-warning">{bodyMetrics.feedback[0]}</p>
            </div>
          )}
          
          {/* Video overlay with current transcript */}
          {currentTranscript && (
            <div className="absolute bottom-4 left-4 right-4 glass rounded-xl p-4">
              <p className="text-foreground text-sm">{currentTranscript}</p>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="glass rounded-2xl p-6 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-neon-magenta" />
                <p className="text-foreground">Processing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Body Language & Cheating Detection Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
          <BodyLanguageCoach 
            metrics={bodyMetrics} 
            isAnalyzing={isBodyAnalyzing} 
            compact
          />
          <CheatingAlert 
            metrics={cheatingMetrics}
            showDetails={true}
          />
        </div>

        {/* Chat/Transcript Panel */}
        <div className="lg:col-span-1 glass rounded-2xl flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Conversation</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'p-3 rounded-xl text-sm',
                  msg.role === 'assistant'
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : 'bg-secondary text-secondary-foreground ml-4'
                )}
              >
                <p className="text-xs font-medium mb-1 text-muted-foreground">
                  {msg.role === 'assistant' ? '🎙️ Interviewer' : '👤 You'}
                </p>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button
          variant={micEnabled ? 'glass' : 'destructive'}
          size="lg"
          onClick={toggleMic}
          className="rounded-full w-14 h-14"
        >
          {micEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        <Button
          variant={videoEnabled ? 'glass' : 'destructive'}
          size="lg"
          onClick={() => setVideoEnabled(!videoEnabled)}
          className="rounded-full w-14 h-14"
        >
          {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={endInterview}
          className="rounded-full w-14 h-14"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default VoiceInterview;
