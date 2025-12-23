import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Target,
  Briefcase,
  Rocket,
  TrendingUp,
  Brain,
  Clock,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface OnboardingData {
  goal: string;
  industry: string;
  experience: string;
  focusAreas: string[];
  practiceFrequency: string;
  sessionDuration: number;
  skipped?: boolean;
  completedAt?: string;
}

interface GoalsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentData: OnboardingData | null;
  onSave: (data: OnboardingData) => void;
}

const goals = [
  { id: 'new-job', label: 'Land a new job', icon: Briefcase },
  { id: 'career-switch', label: 'Switch careers', icon: Rocket },
  { id: 'promotion', label: 'Get promoted', icon: TrendingUp },
  { id: 'practice', label: 'General practice', icon: Brain },
];

const practiceFrequencies = [
  { id: 'daily', label: 'Daily', description: '7 sessions/week' },
  { id: '3-times', label: '3x per week', description: '3 sessions/week' },
  { id: 'weekly', label: 'Weekly', description: '1 session/week' },
  { id: 'flexible', label: 'Flexible', description: '2 sessions/week' },
];

const GoalsEditor: React.FC<GoalsEditorProps> = ({
  open,
  onOpenChange,
  userId,
  currentData,
  onSave,
}) => {
  const { toast } = useToast();
  const [goal, setGoal] = useState(currentData?.goal || 'practice');
  const [practiceFrequency, setPracticeFrequency] = useState(currentData?.practiceFrequency || 'flexible');
  const [sessionDuration, setSessionDuration] = useState(currentData?.sessionDuration || 30);

  useEffect(() => {
    if (currentData) {
      setGoal(currentData.goal || 'practice');
      setPracticeFrequency(currentData.practiceFrequency || 'flexible');
      setSessionDuration(currentData.sessionDuration || 30);
    }
  }, [currentData]);

  const handleSave = () => {
    const updatedData: OnboardingData = {
      goal,
      industry: currentData?.industry || 'other',
      experience: currentData?.experience || 'mid',
      focusAreas: currentData?.focusAreas || [],
      practiceFrequency,
      sessionDuration,
      skipped: false,
      completedAt: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem(`onboarding_${userId}`, JSON.stringify(updatedData));

    onSave(updatedData);
    onOpenChange(false);

    toast({
      title: 'Goals updated',
      description: 'Your practice goals have been saved.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Edit Practice Goals
          </DialogTitle>
          <DialogDescription>
            Customize your weekly practice targets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main Goal */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Main Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {goals.map((g) => (
                <Card
                  key={g.id}
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:scale-[1.02]',
                    goal === g.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'glass hover:bg-card/80'
                  )}
                  onClick={() => setGoal(g.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'p-1.5 rounded-lg',
                        goal === g.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}
                    >
                      <g.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{g.label}</span>
                    {goal === g.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Practice Frequency */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Weekly Practice Target</label>
            <div className="grid grid-cols-2 gap-2">
              {practiceFrequencies.map((freq) => (
                <Card
                  key={freq.id}
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:scale-[1.02]',
                    practiceFrequency === freq.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'glass hover:bg-card/80'
                  )}
                  onClick={() => setPracticeFrequency(freq.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{freq.label}</p>
                      <p className="text-xs text-muted-foreground">{freq.description}</p>
                    </div>
                    {practiceFrequency === freq.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Session Duration */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Session Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((duration) => (
                <Card
                  key={duration}
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:scale-[1.02] text-center',
                    sessionDuration === duration
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'glass hover:bg-card/80'
                  )}
                  onClick={() => setSessionDuration(duration)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Clock
                      className={cn(
                        'w-4 h-4',
                        sessionDuration === duration ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <span className="text-sm font-semibold text-foreground">{duration}</span>
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Goals
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsEditor;
