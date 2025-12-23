import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  Calendar,
  Loader2,
  Activity,
  Mic,
  Video,
  BookOpen,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface Session {
  id: string;
  session_type: string;
  status: string;
  duration_minutes: number | null;
  overall_score: number | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

interface DailyStats {
  date: string;
  sessions: number;
  avgScore: number;
  totalMinutes: number;
}

const Performance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  // Fetch sessions
  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      try {
        let query = supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (timeRange === 'week') {
          query = query.gte('created_at', subDays(new Date(), 7).toISOString());
        } else if (timeRange === 'month') {
          query = query.gte('created_at', subDays(new Date(), 30).toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load performance data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user, timeRange, toast]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const scoredSessions = completedSessions.filter(s => s.overall_score !== null);
    
    const totalSessions = sessions.length;
    const completedCount = completedSessions.length;
    const avgScore = scoredSessions.length > 0
      ? scoredSessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / scoredSessions.length
      : 0;
    const totalMinutes = completedSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    
    // Calculate trend (compare first half to second half)
    const halfIndex = Math.floor(scoredSessions.length / 2);
    const firstHalf = scoredSessions.slice(halfIndex);
    const secondHalf = scoredSessions.slice(0, halfIndex);
    
    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((acc, s) => acc + (s.overall_score || 0), 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((acc, s) => acc + (s.overall_score || 0), 0) / secondHalf.length
      : 0;
    
    const trend = secondHalfAvg - firstHalfAvg;
    const trendPercentage = firstHalfAvg > 0 ? ((trend / firstHalfAvg) * 100) : 0;

    // Session type breakdown
    const typeBreakdown = sessions.reduce((acc, s) => {
      acc[s.session_type] = (acc[s.session_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Best score
    const bestScore = Math.max(...scoredSessions.map(s => s.overall_score || 0), 0);

    return {
      totalSessions,
      completedCount,
      avgScore,
      totalMinutes,
      trend,
      trendPercentage,
      typeBreakdown,
      bestScore,
    };
  }, [sessions]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

    return interval.map(date => {
      const daySessions = sessions.filter(s => 
        isSameDay(new Date(s.created_at), date)
      );
      const completedDay = daySessions.filter(s => s.status === 'completed');
      const scoredDay = completedDay.filter(s => s.overall_score !== null);
      
      return {
        date: format(date, 'MMM d'),
        fullDate: format(date, 'yyyy-MM-dd'),
        sessions: daySessions.length,
        avgScore: scoredDay.length > 0
          ? scoredDay.reduce((acc, s) => acc + (s.overall_score || 0), 0) / scoredDay.length
          : null,
        minutes: completedDay.reduce((acc, s) => acc + (s.duration_minutes || 0), 0),
      };
    });
  }, [sessions, timeRange]);

  // Pie chart data for session types
  const pieData = useMemo(() => {
    const types = [
      { name: 'Voice', value: stats.typeBreakdown['voice'] || 0, color: 'hsl(180, 100%, 50%)' },
      { name: 'Mock', value: stats.typeBreakdown['mock'] || 0, color: 'hsl(270, 100%, 65%)' },
      { name: 'Practice', value: stats.typeBreakdown['practice'] || 0, color: 'hsl(120, 100%, 50%)' },
    ].filter(t => t.value > 0);
    
    return types;
  }, [stats.typeBreakdown]);

  // Recent sessions for insights
  const recentSessions = sessions.slice(0, 5);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'voice':
        return Mic;
      case 'mock':
        return Video;
      case 'practice':
        return BookOpen;
      default:
        return Activity;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-neon-green';
    if (score >= 6) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-magenta to-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your interview progress and improvement
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="glass rounded-xl p-1 flex gap-1">
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              {range === 'all' ? 'All Time' : `Last ${range === 'week' ? '7 Days' : '30 Days'}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalSessions}</p>
          <p className="text-sm text-muted-foreground">Interview Sessions</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-neon-cyan" />
            </div>
            {stats.trend !== 0 && (
              <div className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded-lg",
                stats.trend > 0 ? 'bg-neon-green/10 text-neon-green' : 'bg-destructive/10 text-destructive'
              )}>
                {stats.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(stats.trendPercentage).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.avgScore.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">Average Score</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-neon-purple" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalMinutes}</p>
          <p className="text-sm text-muted-foreground">Minutes Practiced</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-neon-green/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-neon-green" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.bestScore.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">Best Score</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Trend Chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon-cyan" />
            Score Progress
          </h3>
          {chartData.some(d => d.avgScore !== null) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(215, 20%, 65%)" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(215, 20%, 65%)" 
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 10]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 15%, 12%)',
                      border: '1px solid hsl(220, 15%, 20%)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                    labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    stroke="hsl(180, 100%, 50%)"
                    fill="url(#scoreGradient)"
                    strokeWidth={2}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No score data yet</p>
                <p className="text-sm text-muted-foreground">Complete some interviews to see your progress</p>
              </div>
            </div>
          )}
        </div>

        {/* Session Types Pie Chart */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-neon-purple" />
            Session Types
          </h3>
          {pieData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 15%, 12%)',
                      border: '1px solid hsl(220, 15%, 20%)',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No sessions yet</p>
            </div>
          )}
          <div className="flex justify-center gap-4 mt-4">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Practice Activity Chart */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neon-green" />
          Daily Activity
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(215, 20%, 65%)" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(215, 20%, 65%)" 
                fontSize={12}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220, 15%, 12%)',
                  border: '1px solid hsl(220, 15%, 20%)',
                  borderRadius: '12px',
                }}
              />
              <Bar 
                dataKey="sessions" 
                fill="hsl(270, 100%, 65%)" 
                radius={[4, 4, 0, 0]}
                name="Sessions"
              />
              <Bar 
                dataKey="minutes" 
                fill="hsl(120, 100%, 50%)" 
                radius={[4, 4, 0, 0]}
                name="Minutes"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-neon-magenta" />
          Recent Sessions
        </h3>
        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const SessionIcon = getSessionIcon(session.session_type);
              return (
                <div
                  key={session.id}
                  className="glass-hover rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <SessionIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium capitalize">
                        {session.session_type} Interview
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{format(new Date(session.created_at), 'MMM d, yyyy')}</span>
                        {session.duration_minutes && (
                          <span>{session.duration_minutes} min</span>
                        )}
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs capitalize",
                          session.status === 'completed' 
                            ? 'bg-neon-green/20 text-neon-green'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {session.overall_score !== null && (
                      <div className="text-right">
                        <p className={cn("text-2xl font-bold font-mono", getScoreColor(session.overall_score))}>
                          {session.overall_score.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No sessions yet</p>
            <p className="text-sm text-muted-foreground">Start practicing to see your history here</p>
          </div>
        )}
      </div>

      {/* Insights Section */}
      {stats.totalSessions > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-neon-cyan" />
            Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Consistency Insight */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-neon-purple" />
                <span className="text-sm font-medium text-foreground">Consistency</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.totalSessions >= 10
                  ? "Great job! You're practicing regularly. Keep up the momentum!"
                  : stats.totalSessions >= 5
                  ? "Good progress! Try to practice 2-3 times per week for best results."
                  : "Just getting started. Set a goal of 3 practice sessions this week!"}
              </p>
            </div>

            {/* Score Trend Insight */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {stats.trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-neon-green" />
                ) : stats.trend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-warning" />
                ) : (
                  <Target className="w-4 h-4 text-neon-cyan" />
                )}
                <span className="text-sm font-medium text-foreground">Performance Trend</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.trend > 0.5
                  ? "Your scores are improving! The practice is paying off."
                  : stats.trend < -0.5
                  ? "Scores have dipped recently. Consider reviewing feedback from past sessions."
                  : "Scores are stable. Try new question categories to challenge yourself."}
              </p>
            </div>

            {/* Session Type Insight */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-neon-magenta" />
                <span className="text-sm font-medium text-foreground">Practice Mix</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {pieData.length === 1
                  ? `You've only tried ${pieData[0]?.name} sessions. Try other modes for a well-rounded practice!`
                  : pieData.length === 0
                  ? "Start with Voice Interview for the most realistic practice experience."
                  : "Great variety! You're using multiple practice modes effectively."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Performance Data Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Complete your first interview session to start tracking your progress and see detailed analytics here.
          </p>
        </div>
      )}
    </div>
  );
};

export default Performance;
