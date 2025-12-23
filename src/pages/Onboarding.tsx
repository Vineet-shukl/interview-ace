import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  Sparkles,
  Target,
  Briefcase,
  GraduationCap,
  Rocket,
  Clock,
  Brain,
  Users,
  Code,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';

interface OnboardingData {
  goal: string;
  industry: string;
  experience: string;
  focusAreas: string[];
  practiceFrequency: string;
  sessionDuration: number;
}

const goals = [
  { id: 'new-job', label: 'Land a new job', icon: Briefcase, description: 'Prepare for upcoming interviews' },
  { id: 'career-switch', label: 'Switch careers', icon: Rocket, description: 'Transition to a new field' },
  { id: 'promotion', label: 'Get promoted', icon: TrendingUp, description: 'Level up in your current role' },
  { id: 'practice', label: 'General practice', icon: Brain, description: 'Keep my skills sharp' },
];

const industries = [
  { id: 'tech', label: 'Technology', icon: Code },
  { id: 'finance', label: 'Finance', icon: TrendingUp },
  { id: 'consulting', label: 'Consulting', icon: Users },
  { id: 'healthcare', label: 'Healthcare', icon: Target },
  { id: 'marketing', label: 'Marketing', icon: Sparkles },
  { id: 'other', label: 'Other', icon: Briefcase },
];

const experienceLevels = [
  { id: 'student', label: 'Student / Fresh Graduate', description: 'Just starting my career journey' },
  { id: 'junior', label: 'Junior (0-2 years)', description: 'Building foundational experience' },
  { id: 'mid', label: 'Mid-level (3-5 years)', description: 'Growing expertise in my field' },
  { id: 'senior', label: 'Senior (6+ years)', description: 'Established professional' },
  { id: 'executive', label: 'Executive / Leadership', description: 'Leadership and management roles' },
];

const focusAreas = [
  { id: 'behavioral', label: 'Behavioral Questions', icon: Users },
  { id: 'technical', label: 'Technical Skills', icon: Code },
  { id: 'case-study', label: 'Case Studies', icon: Brain },
  { id: 'communication', label: 'Communication', icon: Sparkles },
  { id: 'leadership', label: 'Leadership', icon: Target },
  { id: 'problem-solving', label: 'Problem Solving', icon: Rocket },
];

const practiceFrequencies = [
  { id: 'daily', label: 'Daily', description: 'Practice every day' },
  { id: '3-times', label: '3x per week', description: 'Regular practice schedule' },
  { id: 'weekly', label: 'Weekly', description: 'Once a week sessions' },
  { id: 'flexible', label: 'Flexible', description: 'Practice when I can' },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    goal: '',
    industry: '',
    experience: '',
    focusAreas: [],
    practiceFrequency: '',
    sessionDuration: 30,
  });

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const completeOnboarding = (skipped = false) => {
    if (!user) return;

    // Save onboarding data to localStorage
    localStorage.setItem(`onboarding_${user.id}`, JSON.stringify({
      ...data,
      skipped,
      completedAt: new Date().toISOString(),
    }));

    // Save preferences for Settings page compatibility (only if not skipped)
    if (!skipped && data.experience) {
      localStorage.setItem(`preferences_${user.id}`, JSON.stringify({
        emailNotifications: true,
        practiceReminders: data.practiceFrequency === 'daily',
        weeklyDigest: true,
        feedbackAlerts: true,
        defaultDifficulty: data.experience === 'senior' || data.experience === 'executive' ? 'hard' : 
                           data.experience === 'mid' ? 'medium' : 'easy',
        sessionDuration: data.sessionDuration,
        autoRecordSessions: true,
        showCheatingAlerts: true,
      }));
    }

    navigate('/dashboard');
  };

  const handleSkip = () => {
    completeOnboarding(true);
  };

  const toggleFocusArea = (id: string) => {
    setData((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(id)
        ? prev.focusAreas.filter((a) => a !== id)
        : [...prev.focusAreas, id],
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.goal !== '';
      case 1: return data.industry !== '';
      case 2: return data.experience !== '';
      case 3: return data.focusAreas.length > 0;
      case 4: return data.practiceFrequency !== '';
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">What's your main goal?</h2>
              <p className="text-muted-foreground">We'll personalize your experience based on this</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {goals.map((goal) => (
                <Card
                  key={goal.id}
                  className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                    data.goal === goal.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'glass hover:bg-card/80'
                  }`}
                  onClick={() => setData({ ...data, goal: goal.id })}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      data.goal === goal.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <goal.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{goal.label}</h3>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    </div>
                    {data.goal === goal.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Which industry?</h2>
              <p className="text-muted-foreground">We'll tailor questions to your field</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {industries.map((industry) => (
                <Card
                  key={industry.id}
                  className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                    data.industry === industry.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'glass hover:bg-card/80'
                  }`}
                  onClick={() => setData({ ...data, industry: industry.id })}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      data.industry === industry.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <industry.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-foreground">{industry.label}</span>
                    {data.industry === industry.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Your experience level?</h2>
              <p className="text-muted-foreground">This helps us adjust question difficulty</p>
            </div>
            <div className="space-y-3">
              {experienceLevels.map((level) => (
                <Card
                  key={level.id}
                  className={`p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                    data.experience === level.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'glass hover:bg-card/80'
                  }`}
                  onClick={() => setData({ ...data, experience: level.id })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{level.label}</h3>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                    {data.experience === level.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">What would you like to focus on?</h2>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {focusAreas.map((area) => (
                <Card
                  key={area.id}
                  className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                    data.focusAreas.includes(area.id)
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'glass hover:bg-card/80'
                  }`}
                  onClick={() => toggleFocusArea(area.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      data.focusAreas.includes(area.id) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <area.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-foreground">{area.label}</span>
                    {data.focusAreas.includes(area.id) && (
                      <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Set your practice schedule</h2>
              <p className="text-muted-foreground">Consistency is key to improvement</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-3">How often can you practice?</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {practiceFrequencies.map((freq) => (
                    <Card
                      key={freq.id}
                      className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                        data.practiceFrequency === freq.id
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'glass hover:bg-card/80'
                      }`}
                      onClick={() => setData({ ...data, practiceFrequency: freq.id })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">{freq.label}</h4>
                          <p className="text-sm text-muted-foreground">{freq.description}</p>
                        </div>
                        {data.practiceFrequency === freq.id && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-3">Preferred session length</h3>
                <div className="grid gap-3 grid-cols-4">
                  {[15, 30, 45, 60].map((duration) => (
                    <Card
                      key={duration}
                      className={`p-4 cursor-pointer transition-all hover:scale-[1.02] text-center ${
                        data.sessionDuration === duration
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'glass hover:bg-card/80'
                      }`}
                      onClick={() => setData({ ...data, sessionDuration: duration })}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Clock className={`w-5 h-5 ${
                          data.sessionDuration === duration ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <span className="font-semibold text-foreground">{duration}</span>
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background bg-holographic flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-pulse-soft animation-delay-500" />
      </div>

      {/* Header with progress */}
      <div className="p-6 relative z-10">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center shadow-glow-primary">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl text-gradient">InterVue</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Step {step + 1} of {totalSteps}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Skip for now
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-2xl animate-fade-in">
          {step === 0 && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <GraduationCap className="w-4 h-4" />
                Let's get you set up
              </div>
            </div>
          )}
          {renderStep()}
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="p-6 relative z-10">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className={step === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant="hero"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {step === totalSteps - 1 ? 'Get Started' : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
