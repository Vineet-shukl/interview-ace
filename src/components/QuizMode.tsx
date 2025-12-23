import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  RotateCcw,
  ChevronLeft,
  Timer,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Mic,
  MicOff,
  SkipForward,
  Award,
  Target,
  TrendingUp,
  StopCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface Question {
  id: string;
  question_text: string;
  sample_answer: string | null;
  tips: string | null;
  difficulty: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface QuizResponse {
  questionId: string;
  response: string;
  timeTaken: number;
  submitted: boolean;
}

interface QuizModeProps {
  questions: Question[];
  categories: Category[];
  selectedCategory: string | null;
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard';
}

export const QuizMode: React.FC<QuizModeProps> = ({
  questions,
  categories,
  selectedCategory,
  difficultyFilter,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Quiz state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Timer
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  // Voice recognition
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (selectedCategory && q.category_id !== selectedCategory) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    return true;
  });

  const currentQuestion = filteredQuestions[currentIndex];

  // Initialize session
  useEffect(() => {
    const createSession = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'quiz',
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;
        setSessionId(data.id);
      } catch (error) {
        console.error('Error creating session:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to start quiz session.',
        });
      }
    };

    createSession();
  }, [user, toast]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setUserResponse((prev) => prev + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Start timer when question changes
  useEffect(() => {
    setQuestionStartTime(timeElapsed);
    setIsTimerRunning(true);
  }, [currentIndex]);

  const toggleRecording = () => {
    if (!recognition) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Voice recording is not supported in your browser.',
      });
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const submitResponse = async () => {
    if (!currentQuestion || !sessionId || !userResponse.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Response',
        description: 'Please provide an answer before submitting.',
      });
      return;
    }

    setIsSubmitting(true);
    const timeTaken = timeElapsed - questionStartTime;

    try {
      // Save to database
      const { error } = await supabase.from('interview_responses').insert({
        session_id: sessionId,
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        response_text: userResponse.trim(),
        duration_seconds: timeTaken,
      });

      if (error) throw error;

      // Track locally
      setResponses((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          response: userResponse.trim(),
          timeTaken,
          submitted: true,
        },
      ]);

      toast({
        title: 'Response Saved',
        description: 'Moving to next question...',
      });

      // Move to next question
      if (currentIndex < filteredQuestions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setUserResponse('');
        if (isRecording && recognition) {
          recognition.stop();
          setIsRecording(false);
        }
      } else {
        completeQuiz();
      }
    } catch (error) {
      console.error('Error saving response:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save response.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipQuestion = () => {
    setResponses((prev) => [
      ...prev,
      {
        questionId: currentQuestion?.id || '',
        response: '',
        timeTaken: timeElapsed - questionStartTime,
        submitted: false,
      },
    ]);

    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserResponse('');
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    if (recognition && isRecording) {
      recognition.stop();
      setIsRecording(false);
    }
    
    setIsTimerRunning(false);
    setQuizComplete(true);

    if (sessionId) {
      try {
        const { error } = await supabase
          .from('interview_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            duration_minutes: Math.ceil(timeElapsed / 60),
          })
          .eq('id', sessionId);
        
        if (error) {
          console.error('Error completing session:', error);
        } else {
          toast({
            title: 'Test Ended',
            description: 'Your session has been saved.',
          });
        }
      } catch (error) {
        console.error('Error completing session:', error);
      }
    } else {
      toast({
        title: 'Test Ended',
        description: 'Session completed.',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-neon-green/20 text-neon-green border-neon-green/30';
      case 'medium':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'hard':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'General';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'General';
  };

  const answeredCount = responses.filter((r) => r.submitted).length;
  const skippedCount = responses.filter((r) => !r.submitted).length;

  // Quiz Complete Screen
  if (quizComplete) {
    const avgTime = responses.length > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.timeTaken, 0) / responses.length)
      : 0;

    return (
      <div className="h-full flex items-center justify-center animate-fade-in">
        <div className="glass rounded-2xl p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-green to-primary flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8 text-primary-foreground" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">Quiz Complete!</h2>
          <p className="text-muted-foreground mb-8">Great job practicing your interview skills.</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-xl p-4">
              <Target className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{answeredCount}</p>
              <p className="text-xs text-muted-foreground">Answered</p>
            </div>
            <div className="glass rounded-xl p-4">
              <SkipForward className="w-6 h-6 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{skippedCount}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
            <div className="glass rounded-xl p-4">
              <Timer className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{formatTime(timeElapsed)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
          </div>

          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Average per question</span>
              <span className="font-mono text-foreground">{formatTime(avgTime)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="glass"
              className="flex-1"
              onClick={() => setShowResults(!showResults)}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {showResults ? 'Hide' : 'View'} Responses
            </Button>
            <Button
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Quiz
            </Button>
          </div>

          {showResults && (
            <div className="mt-6 space-y-4 text-left max-h-64 overflow-y-auto">
              {responses.map((r, idx) => {
                const q = filteredQuestions.find((fq) => fq.id === r.questionId);
                return (
                  <div key={idx} className="glass rounded-xl p-4">
                    <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                      {q?.question_text}
                    </p>
                    {r.submitted ? (
                      <p className="text-sm text-muted-foreground line-clamp-3">{r.response}</p>
                    ) : (
                      <p className="text-sm text-warning italic">Skipped</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Time: {formatTime(r.timeTaken)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (filteredQuestions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">No questions available with current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Progress & Timer Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="font-mono text-lg font-bold text-foreground">
              {formatTime(timeElapsed)}
            </span>
          </div>

          <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-neon-green" />
              <span className="font-mono text-foreground">{answeredCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-warning" />
              <span className="font-mono text-foreground">{skippedCount}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {filteredQuestions.length}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={completeQuiz}
          >
            <StopCircle className="w-4 h-4 mr-2" />
            End Test
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full mb-6">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-neon-purple transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / filteredQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col">
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={cn(
                'px-2 py-1 rounded-lg text-xs font-medium border',
                getDifficultyColor(currentQuestion?.difficulty || 'medium')
              )}
            >
              {currentQuestion?.difficulty}
            </span>
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
              {getCategoryName(currentQuestion?.category_id || null)}
            </span>
          </div>

          <p className="text-xl text-foreground leading-relaxed">
            {currentQuestion?.question_text}
          </p>
        </div>

        {/* Response Input */}
        <div className="glass rounded-2xl p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Your Answer</p>
            <Button
              variant={isRecording ? 'default' : 'glass'}
              size="sm"
              onClick={toggleRecording}
              className={cn(isRecording && 'animate-pulse')}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Voice Input
                </>
              )}
            </Button>
          </div>

          <Textarea
            value={userResponse}
            onChange={(e) => setUserResponse(e.target.value)}
            placeholder="Type or speak your answer here..."
            className="flex-1 min-h-[150px] resize-none bg-background/50 border-border/50"
          />

          <div className="flex items-center justify-between mt-4">
            <Button variant="ghost" onClick={skipQuestion}>
              <SkipForward className="w-4 h-4 mr-2" />
              Skip
            </Button>

            <div className="flex items-center gap-3">
              {currentIndex > 0 && (
                <Button
                  variant="glass"
                  onClick={() => {
                    setCurrentIndex((prev) => prev - 1);
                    setUserResponse('');
                  }}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}

              <Button onClick={submitResponse} disabled={isSubmitting || !userResponse.trim()}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Answer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
