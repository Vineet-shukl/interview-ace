import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Mic,
  Video,
  BookOpen,
  Activity,
  Clock,
  Target,
  CalendarIcon,
  Filter,
  ChevronRight,
  Loader2,
  X,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface Session {
  id: string;
  session_type: string;
  status: string;
  duration_minutes: number | null;
  overall_score: number | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const ActivityHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load activity history.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user, toast]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Type filter
      if (typeFilter !== 'all' && session.session_type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && session.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const sessionDate = new Date(session.created_at);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(sessionDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          })) {
            return false;
          }
        } else if (dateRange.from) {
          if (sessionDate < startOfDay(dateRange.from)) {
            return false;
          }
        } else if (dateRange.to) {
          if (sessionDate > endOfDay(dateRange.to)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [sessions, typeFilter, statusFilter, dateRange]);

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

  const getSessionPath = (type: string) => {
    switch (type) {
      case 'voice':
        return '/voice-interview';
      case 'mock':
        return '/mock-sessions';
      default:
        return '/practice';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      completed: { className: 'bg-success/20 text-success border-success/30', label: 'Completed' },
      in_progress: { className: 'bg-warning/20 text-warning border-warning/30', label: 'In Progress' },
      pending: { className: 'bg-muted text-muted-foreground border-border', label: 'Pending' },
      cancelled: { className: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Cancelled' },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge variant="outline" className={cn('text-xs', variant.className)}>
        {variant.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      voice: { className: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30', label: 'Voice' },
      mock: { className: 'bg-neon-purple/20 text-neon-purple border-neon-purple/30', label: 'Mock' },
      practice: { className: 'bg-neon-green/20 text-neon-green border-neon-green/30', label: 'Practice' },
      quiz: { className: 'bg-neon-magenta/20 text-neon-magenta border-neon-magenta/30', label: 'Quiz' },
    };
    const variant = variants[type] || { className: 'bg-muted text-muted-foreground', label: type };
    return (
      <Badge variant="outline" className={cn('text-xs', variant.className)}>
        {variant.label}
      </Badge>
    );
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || dateRange.from || dateRange.to;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading activity history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center">
              <History className="w-5 h-5 text-primary-foreground" />
            </div>
            Activity History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and filter all your past interview sessions
          </p>
        </div>

        <Button variant="hero" onClick={() => navigate('/voice-interview')}>
          <Play className="w-4 h-4" />
          Start New Session
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] glass">
                <SelectValue placeholder="Session Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="mock">Mock</SelectItem>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] glass">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="glass justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      </>
                    ) : (
                      format(dateRange.from, 'MMM d, yyyy')
                    )
                  ) : (
                    'Select dates'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="ml-auto text-sm text-muted-foreground">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </div>
        </div>
      </Card>

      {/* Sessions List */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const Icon = getSessionIcon(session.session_type);
            const sessionPath = getSessionPath(session.session_type);

            return (
              <Card
                key={session.id}
                onClick={() => navigate(sessionPath)}
                className="glass p-4 hover:bg-card/80 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground capitalize">
                        {session.session_type} Session
                      </span>
                      {getTypeBadge(session.session_type)}
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {format(new Date(session.created_at), 'MMM d, yyyy')}
                      </span>
                      {session.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.duration_minutes} min
                        </span>
                      )}
                      {session.overall_score !== null && (
                        <span className={cn(
                          'flex items-center gap-1 font-medium',
                          session.overall_score >= 8 ? 'text-success' :
                          session.overall_score >= 6 ? 'text-warning' : 'text-destructive'
                        )}>
                          <Target className="w-3 h-3" />
                          Score: {session.overall_score}/10
                        </span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {session.notes}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass p-12 text-center">
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {hasActiveFilters ? 'No sessions match your filters' : 'No sessions yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results.'
              : 'Start your first interview session to see your history here.'}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => navigate('/voice-interview')}>
              <Play className="w-4 h-4 mr-2" />
              Start First Session
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default ActivityHistory;
