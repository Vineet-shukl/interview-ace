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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Brain,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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

interface QuizResponse {
  id: string;
  question_id: string | null;
  question_text: string;
  response_text: string | null;
  duration_seconds: number | null;
  created_at: string;
  session_id: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Question {
  id: string;
  category_id: string | null;
  difficulty: string;
}

interface DailyStats {
  date: string;
  sessions: number;
  avgScore: number;
  totalMinutes: number;
}

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalQuestions: number;
  avgResponseTime: number;
  responseCount: number;
}

const Performance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'quiz'>('overview');

  // Fetch all data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        let sessionQuery = supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (timeRange === 'week') {
          sessionQuery = sessionQuery.gte('created_at', subDays(new Date(), 7).toISOString());
        } else if (timeRange === 'month') {
          sessionQuery = sessionQuery.gte('created_at', subDays(new Date(), 30).toISOString());
        }

        const [sessionsRes, responsesRes, categoriesRes, questionsRes] = await Promise.all([
          sessionQuery,
          supabase
            .from('interview_responses')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase.from('question_categories').select('*'),
          supabase.from('interview_questions').select('id, category_id, difficulty'),
        ]);

        if (sessionsRes.error) throw sessionsRes.error;
        setSessions(sessionsRes.data || []);

        // Filter responses by user's sessions
        const userSessionIds = (sessionsRes.data || []).map(s => s.id);
        const userResponses = (responsesRes.data || []).filter(r => 
          userSessionIds.includes(r.session_id)
        );
        setQuizResponses(userResponses);

        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (questionsRes.data) setQuestions(questionsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load performance data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  // Category performance analysis
  const categoryAnalysis = useMemo(() => {
    const categoryMap = new Map<string, { responses: number; totalTime: number; questionIds: Set<string> }>();

    quizResponses.forEach(response => {
      if (!response.question_id) return;
      
      const question = questions.find(q => q.id === response.question_id);
      if (!question?.category_id) return;

      const current = categoryMap.get(question.category_id) || { 
        responses: 0, 
        totalTime: 0, 
        questionIds: new Set<string>() 
      };
      
      current.responses += 1;
      current.totalTime += response.duration_seconds || 0;
      current.questionIds.add(question.id);
      categoryMap.set(question.category_id, current);
    });

    const analysis: CategoryStats[] = [];
    categoryMap.forEach((data, categoryId) => {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        analysis.push({
          categoryId,
          categoryName: category.name,
          totalQuestions: data.questionIds.size,
          avgResponseTime: data.responses > 0 ? Math.round(data.totalTime / data.responses) : 0,
          responseCount: data.responses,
        });
      }
    });

    return analysis.sort((a, b) => b.responseCount - a.responseCount);
  }, [quizResponses, questions, categories]);

  // Radar chart data for category coverage
  const radarData = useMemo(() => {
    return categories.slice(0, 8).map(cat => {
      const catStats = categoryAnalysis.find(c => c.categoryId === cat.id);
      return {
        category: cat.name.length > 10 ? cat.name.slice(0, 10) + '...' : cat.name,
        fullName: cat.name,
        responses: catStats?.responseCount || 0,
        maxResponses: Math.max(...categoryAnalysis.map(c => c.responseCount), 1),
      };
    });
  }, [categories, categoryAnalysis]);

  // Identify weak areas (categories with few responses or high avg time)
  const weakAreas = useMemo(() => {
    if (categoryAnalysis.length === 0) return [];
    
    const avgTime = categoryAnalysis.reduce((sum, c) => sum + c.avgResponseTime, 0) / categoryAnalysis.length;
    const avgResponses = categoryAnalysis.reduce((sum, c) => sum + c.responseCount, 0) / categoryAnalysis.length;

    return categoryAnalysis
      .filter(c => c.avgResponseTime > avgTime * 1.2 || c.responseCount < avgResponses * 0.5)
      .slice(0, 3);
  }, [categoryAnalysis]);

  // Quiz session history (quiz type only)
  const quizSessions = useMemo(() => {
    return sessions.filter(s => s.session_type === 'quiz').slice(0, 10);
  }, [sessions]);

  // Quiz progress over time
  const quizProgressData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

    return interval.map(date => {
      const dayResponses = quizResponses.filter(r => 
        isSameDay(new Date(r.created_at), date)
      );
      
      return {
        date: format(date, 'MMM d'),
        responses: dayResponses.length,
        avgTime: dayResponses.length > 0
          ? Math.round(dayResponses.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / dayResponses.length)
          : 0,
      };
    });
  }, [quizResponses, timeRange]);

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

        <div className="flex items-center gap-3">
          {/* Tab Selector */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'quiz')}>
            <TabsList className="glass">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Quiz Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>

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
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <>

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
      {sessions.length === 0 && activeTab === 'overview' && (
        <div className="glass rounded-2xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Performance Data Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Complete your first interview session to start tracking your progress and see detailed analytics here.
          </p>
        </div>
      )}
      </>
      )}

      {/* Quiz Analytics Tab Content */}
      {activeTab === 'quiz' && (
        <>
          {/* Quiz Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{quizSessions.length}</p>
              <p className="text-sm text-muted-foreground">Quiz Sessions</p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-neon-cyan" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{quizResponses.length}</p>
              <p className="text-sm text-muted-foreground">Questions Answered</p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-neon-purple" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{categoryAnalysis.length}</p>
              <p className="text-sm text-muted-foreground">Categories Practiced</p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-neon-green/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-neon-green" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {quizResponses.length > 0
                  ? Math.round(quizResponses.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / quizResponses.length)
                  : 0}s
              </p>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quiz Progress Chart */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-neon-cyan" />
                Quiz Activity Over Time
              </h3>
              {quizProgressData.some(d => d.responses > 0) ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={quizProgressData}>
                      <defs>
                        <linearGradient id="quizGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(270, 100%, 65%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(270, 100%, 65%)" stopOpacity={0} />
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
                        dataKey="responses"
                        stroke="hsl(270, 100%, 65%)"
                        fill="url(#quizGradient)"
                        strokeWidth={2}
                        name="Questions Answered"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No quiz data yet</p>
                    <p className="text-sm text-muted-foreground">Complete some quiz sessions to see your progress</p>
                  </div>
                </div>
              )}
            </div>

            {/* Category Coverage Radar */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-neon-purple" />
                Category Coverage
              </h3>
              {radarData.some(d => d.responses > 0) ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(220, 15%, 25%)" />
                      <PolarAngleAxis 
                        dataKey="category" 
                        tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 10 }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 'auto']}
                        tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 10 }}
                      />
                      <Radar
                        name="Responses"
                        dataKey="responses"
                        stroke="hsl(180, 100%, 50%)"
                        fill="hsl(180, 100%, 50%)"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(220, 15%, 12%)',
                          border: '1px solid hsl(220, 15%, 20%)',
                          borderRadius: '12px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Practice more categories to see coverage</p>
                </div>
              )}
            </div>
          </div>

          {/* Weak Areas & Category Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Weak Areas */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Areas to Improve
              </h3>
              {weakAreas.length > 0 ? (
                <div className="space-y-3">
                  {weakAreas.map((area, idx) => (
                    <div key={idx} className="glass rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-foreground font-medium">{area.categoryName}</span>
                        <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded-lg">
                          Needs Practice
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{area.responseCount} responses</span>
                        <span>Avg: {area.avgResponseTime}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-3" />
                  <p className="text-muted-foreground">Great coverage!</p>
                  <p className="text-sm text-muted-foreground">Keep practicing all categories</p>
                </div>
              )}
            </div>

            {/* Category Performance */}
            <div className="lg:col-span-2 glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-neon-cyan" />
                Category Performance
              </h3>
              {categoryAnalysis.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {categoryAnalysis.map((cat, idx) => (
                    <div key={idx} className="glass rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{cat.categoryName}</p>
                          <p className="text-sm text-muted-foreground">
                            {cat.totalQuestions} unique questions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{cat.responseCount}</p>
                          <p className="text-xs text-muted-foreground">Responses</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-neon-cyan">{cat.avgResponseTime}s</p>
                          <p className="text-xs text-muted-foreground">Avg Time</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No category data yet</p>
                  <p className="text-sm text-muted-foreground">Complete some quizzes to see category breakdowns</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Quiz Sessions */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neon-magenta" />
              Recent Quiz Sessions
            </h3>
            {quizSessions.length > 0 ? (
              <div className="space-y-3">
                {quizSessions.map((session) => (
                  <div
                    key={session.id}
                    className="glass-hover rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-neon-purple" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Quiz Session</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}</span>
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No quiz sessions yet</p>
                <p className="text-sm text-muted-foreground">Start a quiz in Practice Mode to see your history</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Performance;
