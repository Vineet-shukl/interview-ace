import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BentoCard from '@/components/dashboard/BentoCard';
import ProgressRing from '@/components/dashboard/ProgressRing';
import GoalsEditor from '@/components/GoalsEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  Mic,
  Video,
  BookOpen,
  TrendingUp,
  Clock,
  Target,
  Zap,
  Calendar,
  Play,
  ChevronRight,
  Sparkles,
  BarChart3,
  Users,
  Award,
  Briefcase,
  Rocket,
  Brain,
  Code,
  AlertCircle,
  Settings2,
} from 'lucide-react';

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  practiceHours: number;
  questionsAnswered: number;
  weeklyGoal: number;
}

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

interface GoalProgress {
  sessionsTarget: number;
  sessionsCompleted: number;
  hoursTarget: number;
  hoursCompleted: number;
  scoreTarget: number;
  currentScore: number;
}

const goalLabels: Record<string, string> = {
  'new-job': 'Land a new job',
  'career-switch': 'Switch careers',
  'promotion': 'Get promoted',
  'practice': 'General practice',
};

const industryLabels: Record<string, string> = {
  'tech': 'Technology',
  'finance': 'Finance',
  'consulting': 'Consulting',
  'healthcare': 'Healthcare',
  'marketing': 'Marketing',
  'other': 'General',
};

const focusAreaLabels: Record<string, { label: string; icon: React.ElementType }> = {
  'behavioral': { label: 'Behavioral Questions', icon: Users },
  'technical': { label: 'Technical Skills', icon: Code },
  'case-study': { label: 'Case Studies', icon: Brain },
  'communication': { label: 'Communication', icon: Sparkles },
  'leadership': { label: 'Leadership', icon: Target },
  'problem-solving': { label: 'Problem Solving', icon: Rocket },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    completedSessions: 0,
    averageScore: 0,
    practiceHours: 0,
    questionsAnswered: 0,
    weeklyGoal: 75,
  });
  const [recentSessions, setRecentSessions] = useState<{ id: string; created_at: string; status: string; session_type: string; overall_score?: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress>({
    sessionsTarget: 10,
    sessionsCompleted: 0,
    hoursTarget: 5,
    hoursCompleted: 0,
    scoreTarget: 8,
    currentScore: 0,
  });
  const [recommendedQuestions, setRecommendedQuestions] = useState<{ id: string; question_text: string; difficulty: string; question_categories?: { name: string; color?: string; icon?: string } | null }[]>([]);
  const [goalsEditorOpen, setGoalsEditorOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load onboarding data
    const savedOnboarding = localStorage.getItem(`onboarding_${user.id}`);
    if (savedOnboarding) {
      setOnboardingData(JSON.parse(savedOnboarding));
    }
  }, [user]);

  // Calculate weekly session target from onboarding
  const weeklySessionTarget = useMemo(() => {
    if (!onboardingData || onboardingData.skipped) return 3; // default
    const frequencyMap: Record<string, number> = {
      'daily': 7,
      '3-times': 3,
      'weekly': 1,
      'flexible': 2,
    };
    return frequencyMap[onboardingData.practiceFrequency] || 3;
  }, [onboardingData]);

  // Calculate sessions completed this week
  const weeklySessionsCompleted = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    return recentSessions.filter(session => {
      const sessionDate = new Date(session.created_at);
      return session.status === 'completed' && isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
    }).length;
  }, [recentSessions]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch interview sessions
        const { data: sessions } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (sessions) {
          setRecentSessions(sessions.slice(0, 20)); // Get more to calculate weekly
          const completed = sessions.filter((s) => s.status === 'completed');
          const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
          const avgScore = completed.length > 0
            ? completed.reduce((acc, s) => acc + (Number(s.overall_score) || 0), 0) / completed.length
            : 0;

          // Fetch total responses count
          const { count: responsesCount } = await supabase
            .from('interview_responses')
            .select('*', { count: 'exact', head: true });

          setStats({
            totalSessions: sessions.length,
            completedSessions: completed.length,
            averageScore: Math.round(avgScore * 10) / 10,
            practiceHours: Math.round(totalDuration / 60 * 10) / 10,
            questionsAnswered: responsesCount || 0,
            weeklyGoal: 75,
          });

          // Update goal progress based on onboarding
          const savedOnboarding = localStorage.getItem(`onboarding_${user.id}`);
          const onboarding: OnboardingData | null = savedOnboarding ? JSON.parse(savedOnboarding) : null;
          const frequencyMap: Record<string, number> = {
            'daily': 7,
            '3-times': 3,
            'weekly': 1,
            'flexible': 2,
          };
          const sessionsTarget = onboarding && !onboarding.skipped 
            ? frequencyMap[onboarding.practiceFrequency] || 3 
            : 10;

          setGoalProgress({
            sessionsTarget,
            sessionsCompleted: completed.length,
            hoursTarget: onboarding?.sessionDuration ? Math.ceil((sessionsTarget * onboarding.sessionDuration) / 60) : 5,
            hoursCompleted: Math.round(totalDuration / 60 * 10) / 10,
            scoreTarget: 8,
            currentScore: Math.round(avgScore * 10) / 10,
          });
        }

        // Fetch recommended questions based on onboarding
        const savedOnboarding = localStorage.getItem(`onboarding_${user.id}`);
        if (savedOnboarding) {
          const onboarding: OnboardingData = JSON.parse(savedOnboarding);
          
          let query = supabase
            .from('interview_questions')
            .select('*, question_categories(name, color, icon)')
            .limit(4);

          // Filter by industry if available
          if (onboarding.industry && onboarding.industry !== 'other') {
            query = query.eq('industry', onboarding.industry);
          }

          // Filter by difficulty based on experience
          if (onboarding.experience) {
            const difficultyMap: Record<string, string> = {
              'student': 'easy',
              'junior': 'easy',
              'mid': 'medium',
              'senior': 'hard',
              'executive': 'hard',
            };
            query = query.eq('difficulty', difficultyMap[onboarding.experience] || 'medium');
          }

          const { data: questions } = await query;
          
          if (questions && questions.length > 0) {
            setRecommendedQuestions(questions);
          } else {
            // Fallback to any questions if no matches
            const { data: fallbackQuestions } = await supabase
              .from('interview_questions')
              .select('*, question_categories(name, color, icon)')
              .limit(4);
            setRecommendedQuestions(fallbackQuestions || []);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const quickActions = [
    {
      icon: Mic,
      label: 'Quick Practice',
      description: 'Start a 5-minute practice session',
      color: 'cyan' as const,
      path: '/practice',
    },
    {
      icon: Video,
      label: 'Voice Interview',
      description: 'AI-powered stress interview',
      color: 'magenta' as const,
      path: '/voice-interview',
    },
    {
      icon: BookOpen,
      label: 'Browse Questions',
      description: 'Explore question library',
      color: 'purple' as const,
      path: '/questions',
    },
    {
      icon: Calendar,
      label: 'Schedule Mock',
      description: 'Book a mock interview',
      color: 'orange' as const,
      path: '/mock-sessions',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to ace your next interview? Let's practice!
          </p>
        </div>

        <Button variant="hero" size="lg" onClick={() => navigate('/voice-interview')}>
          <Sparkles className="w-5 h-5" />
          Start AI Interview
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weekly Progress - Large Card */}
        <BentoCard
          title="Weekly Progress"
          size="large"
          iconColor="cyan"
          className="md:col-span-2 lg:col-span-2 lg:row-span-2"
        >
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center space-y-6">
              <ProgressRing
                progress={weeklySessionTarget > 0 ? Math.min(100, Math.round((weeklySessionsCompleted / weeklySessionTarget) * 100)) : 0}
                size={180}
                strokeWidth={12}
                color="cyan"
                label="This Week"
              />
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">
                  {weeklySessionsCompleted} of {weeklySessionTarget} sessions
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.practiceHours} hours practiced • {stats.questionsAnswered} questions answered
                </p>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Stats Cards */}
        <BentoCard
          title="Total Sessions"
          value={stats.totalSessions}
          subtitle="All time"
          icon={BarChart3}
          iconColor="purple"
        />

        <BentoCard
          title="Average Score"
          value={`${stats.averageScore}/10`}
          subtitle="Based on AI feedback"
          icon={Target}
          iconColor="green"
        />

        <BentoCard
          title="Practice Hours"
          value={stats.practiceHours}
          subtitle="This month"
          icon={Clock}
          iconColor="orange"
        />

        <BentoCard
          title="Questions Answered"
          value={stats.questionsAnswered}
          subtitle="Keep practicing!"
          icon={Zap}
          iconColor="magenta"
        />
      </div>

      {/* Goal Progress Section */}
      {onboardingData && !onboardingData.skipped && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Goal: {goalLabels[onboardingData.goal] || 'Interview Practice'}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setGoalsEditorOpen(true)}>
              <Settings2 className="w-4 h-4" />
              Edit Goals
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Sessions Completed</span>
                <span className="text-sm font-medium">{goalProgress.sessionsCompleted}/{goalProgress.sessionsTarget}</span>
              </div>
              <Progress value={(goalProgress.sessionsCompleted / goalProgress.sessionsTarget) * 100} className="h-2" />
            </Card>
            <Card className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Practice Hours</span>
                <span className="text-sm font-medium">{goalProgress.hoursCompleted}/{goalProgress.hoursTarget}h</span>
              </div>
              <Progress value={(goalProgress.hoursCompleted / goalProgress.hoursTarget) * 100} className="h-2" />
            </Card>
            <Card className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Average Score</span>
                <span className="text-sm font-medium">{goalProgress.currentScore || '-'}/{goalProgress.scoreTarget}</span>
              </div>
              <Progress value={goalProgress.currentScore ? (goalProgress.currentScore / goalProgress.scoreTarget) * 100 : 0} className="h-2" />
            </Card>
          </div>
        </div>
      )}

      {/* Complete Onboarding Banner */}
      {onboardingData?.skipped && (
        <Card className="glass p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-foreground">Complete your profile setup</p>
                <p className="text-sm text-muted-foreground">Get personalized recommendations by finishing onboarding</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')}>
              Complete Setup
            </Button>
          </div>
        </Card>
      )}

      {/* Personalized Recommendations */}
      {recommendedQuestions.length > 0 && onboardingData && !onboardingData.skipped && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Recommended for You</h2>
              <p className="text-sm text-muted-foreground">
                Based on your {industryLabels[onboardingData.industry] || ''} focus
                {onboardingData.focusAreas.length > 0 && ` and ${onboardingData.focusAreas.length} skill areas`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/questions')}>
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedQuestions.map((question) => (
              <Card 
                key={question.id} 
                className="glass p-4 hover:bg-card/80 transition-colors cursor-pointer"
                onClick={() => navigate('/practice')}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-2">{question.question_text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        question.difficulty === 'easy' ? 'bg-success/20 text-success' :
                        question.difficulty === 'hard' ? 'bg-destructive/20 text-destructive' :
                        'bg-warning/20 text-warning'
                      }`}>
                        {question.difficulty}
                      </span>
                      {question.question_categories && (
                        <span className="text-xs text-muted-foreground">
                          {question.question_categories.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <BentoCard
              key={action.label}
              title={action.label}
              subtitle={action.description}
              icon={action.icon}
              iconColor={action.color}
              onClick={() => navigate(action.path)}
            >
              <Button variant="glass" size="sm" className="mt-4 w-full">
                <Play className="w-4 h-4" />
                Start
              </Button>
            </BentoCard>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
            View All
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {recentSessions.length > 0 ? (
          <div className="grid gap-3">
            {recentSessions.slice(0, 5).map((session) => {
              const sessionPath = session.session_type === 'voice' 
                ? '/voice-interview' 
                : session.session_type === 'mock' 
                ? '/mock-sessions' 
                : '/practice';
              
              return (
                <div
                  key={session.id}
                  onClick={() => navigate(sessionPath)}
                  className="glass rounded-xl p-4 flex items-center justify-between hover:bg-card/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {session.session_type === 'voice' ? (
                        <Video className="w-5 h-5 text-neon-magenta" />
                      ) : session.session_type === 'mock' ? (
                        <Users className="w-5 h-5 text-neon-purple" />
                      ) : (
                        <Mic className="w-5 h-5 text-neon-cyan" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground capitalize">
                        {session.session_type} Session
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {session.overall_score && (
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-accent" />
                        <span className="font-medium">{session.overall_score}/10</span>
                      </div>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        session.status === 'completed'
                          ? 'bg-success/20 text-success'
                          : session.status === 'in_progress'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {session.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your first practice session to see your progress here
            </p>
            <Button variant="neon" onClick={() => navigate('/practice')}>
              <Play className="w-4 h-4" />
              Start Practicing
            </Button>
          </div>
        )}
      </div>

      {/* Goals Editor Dialog */}
      {user && (
        <GoalsEditor
          open={goalsEditorOpen}
          onOpenChange={setGoalsEditorOpen}
          userId={user.id}
          currentData={onboardingData}
          onSave={(updatedData) => {
            setOnboardingData(updatedData);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
