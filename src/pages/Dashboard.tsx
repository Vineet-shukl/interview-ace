import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BentoCard from '@/components/dashboard/BentoCard';
import ProgressRing from '@/components/dashboard/ProgressRing';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  practiceHours: number;
  questionsAnswered: number;
  weeklyGoal: number;
}

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
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch interview sessions
        const { data: sessions } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (sessions) {
          setRecentSessions(sessions);
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
                progress={stats.weeklyGoal}
                size={180}
                strokeWidth={12}
                color="cyan"
                label="Goal Complete"
              />
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">Keep up the momentum!</p>
                <p className="text-sm text-muted-foreground">
                  You're making great progress towards your weekly goal
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/performance')}>
            View All
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {recentSessions.length > 0 ? (
          <div className="grid gap-3">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="glass rounded-xl p-4 flex items-center justify-between hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
                </div>
              </div>
            ))}
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
    </div>
  );
};

export default Dashboard;
