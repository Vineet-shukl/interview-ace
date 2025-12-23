import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Users,
  Plus,
  Clock,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Video,
  Trash2,
  Send,
  CalendarDays,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface MockInvite {
  id: string;
  session_id: string;
  inviter_id: string;
  invitee_email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Session {
  id: string;
  user_id: string;
  session_type: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  overall_score: number | null;
  notes: string | null;
  created_at: string;
}

const MockSessions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sentInvites, setSentInvites] = useState<MockInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<MockInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create session form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // Fetch data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch mock sessions (session_type = 'mock')
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('session_type', 'mock')
          .order('scheduled_at', { ascending: true });

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);

        // Fetch sent invites
        const { data: sentData, error: sentError } = await supabase
          .from('mock_interview_invites')
          .select('*')
          .eq('inviter_id', user.id)
          .order('created_at', { ascending: false });

        if (sentError) throw sentError;
        setSentInvites(sentData || []);

        // Fetch received invites
        const { data: receivedData, error: receivedError } = await supabase
          .from('mock_interview_invites')
          .select('*')
          .eq('invitee_email', user.email || '')
          .order('created_at', { ascending: false });

        if (receivedError) throw receivedError;
        setReceivedInvites(receivedData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load mock sessions.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Create new mock session and send invite
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteeEmail.trim()) return;

    setIsCreating(true);

    try {
      // Combine date and time
      const scheduledAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      // Create the session first
      const { data: sessionData, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: user.id,
          session_type: 'mock',
          status: 'scheduled',
          scheduled_at: scheduledAt,
          notes: sessionNotes || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create the invite
      const { error: inviteError } = await supabase
        .from('mock_interview_invites')
        .insert({
          session_id: sessionData.id,
          inviter_id: user.id,
          invitee_email: inviteeEmail.toLowerCase().trim(),
        });

      if (inviteError) throw inviteError;

      // Send email notification to invitee
      try {
        await supabase.functions.invoke('send-invite-notification', {
          body: {
            inviterEmail: user.email,
            inviteeEmail: inviteeEmail.toLowerCase().trim(),
            action: 'invited',
            scheduledAt,
            inviterName: user.email?.split('@')[0],
          },
        });
        console.log('Invite notification sent');
      } catch (notifyError) {
        console.error('Failed to send invite notification:', notifyError);
        // Don't block on notification failure
      }

      toast({
        title: 'Invitation Sent!',
        description: `Mock interview invite sent to ${inviteeEmail}.`,
      });

      // Reset form and refresh
      setShowCreateForm(false);
      setInviteeEmail('');
      setScheduledDate('');
      setScheduledTime('');
      setSessionNotes('');

      // Refresh data
      setSessions((prev) => [...prev, sessionData]);
      
    } catch (error) {
      console.error('Error creating session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create mock session.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Send notification email
  const sendNotification = async (invite: MockInvite, action: 'accepted' | 'declined') => {
    try {
      // Get inviter's email from profiles
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', invite.inviter_id)
        .maybeSingle();

      if (!inviterProfile?.email) {
        console.log('Could not find inviter email, skipping notification');
        return;
      }

      // Get session details for scheduled time
      const { data: session } = await supabase
        .from('interview_sessions')
        .select('scheduled_at')
        .eq('id', invite.session_id)
        .maybeSingle();

      await supabase.functions.invoke('send-invite-notification', {
        body: {
          inviterEmail: inviterProfile.email,
          inviteeEmail: user?.email || invite.invitee_email,
          action,
          scheduledAt: session?.scheduled_at,
        },
      });

      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't throw - notification failure shouldn't block the action
    }
  };

  // Accept invite
  const handleAcceptInvite = async (invite: MockInvite) => {
    try {
      const { error } = await supabase
        .from('mock_interview_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      if (error) throw error;

      // Update the session status
      await supabase
        .from('interview_sessions')
        .update({ status: 'confirmed' })
        .eq('id', invite.session_id);

      setReceivedInvites((prev) =>
        prev.map((i) => (i.id === invite.id ? { ...i, status: 'accepted' } : i))
      );

      // Send notification email
      sendNotification(invite, 'accepted');

      toast({
        title: 'Invite Accepted!',
        description: 'The mock interview has been confirmed.',
      });
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept invite.',
      });
    }
  };

  // Decline invite
  const handleDeclineInvite = async (invite: MockInvite) => {
    try {
      const { error } = await supabase
        .from('mock_interview_invites')
        .update({ status: 'declined' })
        .eq('id', invite.id);

      if (error) throw error;

      setReceivedInvites((prev) =>
        prev.map((i) => (i.id === invite.id ? { ...i, status: 'declined' } : i))
      );

      // Send notification email
      sendNotification(invite, 'declined');

      toast({
        title: 'Invite Declined',
        description: 'The invitation has been declined.',
      });
    } catch (error) {
      console.error('Error declining invite:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline invite.',
      });
    }
  };

  // Delete session
  const handleDeleteSession = async (session: Session) => {
    try {
      const { error } = await supabase
        .from('interview_sessions')
        .delete()
        .eq('id', session.id);

      if (error) throw error;

      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      setSentInvites((prev) => prev.filter((i) => i.session_id !== session.id));

      toast({
        title: 'Session Deleted',
        description: 'The mock session has been removed.',
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete session.',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/20 text-warning border-warning/30',
      accepted: 'bg-neon-green/20 text-neon-green border-neon-green/30',
      confirmed: 'bg-neon-green/20 text-neon-green border-neon-green/30',
      declined: 'bg-destructive/20 text-destructive border-destructive/30',
      expired: 'bg-muted text-muted-foreground border-muted',
      scheduled: 'bg-primary/20 text-primary border-primary/30',
      completed: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30',
    };

    return (
      <span
        className={cn(
          'px-2 py-1 rounded-lg text-xs font-medium border capitalize',
          styles[status] || styles.pending
        )}
      >
        {status}
      </span>
    );
  };

  const getInviteForSession = (sessionId: string) => {
    return sentInvites.find((i) => i.session_id === sessionId);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading mock sessions...</p>
        </div>
      </div>
    );
  }

  const upcomingSessions = sessions.filter(
    (s) => s.scheduled_at && !isPast(new Date(s.scheduled_at)) && s.status !== 'completed'
  );
  const pastSessions = sessions.filter(
    (s) => !s.scheduled_at || isPast(new Date(s.scheduled_at)) || s.status === 'completed'
  );
  const pendingReceivedInvites = receivedInvites.filter((i) => i.status === 'pending');

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            Mock Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            Practice with peers and get feedback
          </p>
        </div>

        <Button variant="hero" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4" />
          Schedule Mock Interview
        </Button>
      </div>

      {/* Pending Invites Received */}
      {pendingReceivedInvites.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-neon-magenta" />
            Pending Invitations ({pendingReceivedInvites.length})
          </h2>
          <div className="space-y-3">
            {pendingReceivedInvites.map((invite) => (
              <div
                key={invite.id}
                className="glass-hover rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neon-magenta/20 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-neon-magenta" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Mock Interview Invitation</p>
                    <p className="text-sm text-muted-foreground">
                      Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handleDeclineInvite(invite)}
                    className="border-destructive/30 hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4 text-destructive" />
                    Decline
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleAcceptInvite(invite)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Session Form */}
      {showCreateForm && (
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Schedule New Mock Interview
          </h2>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Partner's Email *
                </label>
                <Input
                  type="email"
                  value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)}
                  placeholder="partner@example.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Notes (Optional)
              </label>
              <Input
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Topics to cover, specific questions to practice..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="glass"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-neon-cyan" />
          Upcoming Sessions ({upcomingSessions.length})
        </h2>
        {upcomingSessions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No upcoming mock interviews scheduled.</p>
            <p className="text-sm text-muted-foreground">
              Click "Schedule Mock Interview" to invite a practice partner.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => {
              const invite = getInviteForSession(session.id);
              return (
                <div
                  key={session.id}
                  className="glass-hover rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
                      <Video className="w-6 h-6 text-neon-cyan" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-medium">Mock Interview</p>
                        {getStatusBadge(session.status)}
                        {invite && getStatusBadge(invite.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {session.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.scheduled_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                        {invite && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {invite.invitee_email}
                          </span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{session.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === 'confirmed' && (
                      <Button variant="success" size="sm">
                        <Video className="w-4 h-4" />
                        Join
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSession(session)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Past Sessions ({pastSessions.length})
          </h2>
          <div className="space-y-3">
            {pastSessions.slice(0, 5).map((session) => {
              const invite = getInviteForSession(session.id);
              return (
                <div
                  key={session.id}
                  className="glass rounded-xl p-4 flex items-center justify-between opacity-70"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Video className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-medium">Mock Interview</p>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {session.scheduled_at && (
                          <span>{format(new Date(session.scheduled_at), 'MMM d, yyyy')}</span>
                        )}
                        {session.duration_minutes && (
                          <span>{session.duration_minutes} min</span>
                        )}
                        {session.overall_score && (
                          <span className="text-neon-green">Score: {session.overall_score}/10</span>
                        )}
                        {invite && <span>{invite.invitee_email}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSession(session)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sent Invites Status */}
      {sentInvites.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-neon-purple" />
            Sent Invitations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sentInvites.map((invite) => (
              <div key={invite.id} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {invite.invitee_email}
                  </span>
                  {getStatusBadge(invite.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                </p>
                {invite.status === 'pending' && isPast(new Date(invite.expires_at)) && (
                  <p className="text-xs text-warning flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    Expired
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sessions.length === 0 && sentInvites.length === 0 && receivedInvites.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Mock Sessions Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Practice with friends or colleagues to get comfortable with interviews. 
            Send an invitation to schedule your first mock interview!
          </p>
          <Button variant="hero" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4" />
            Schedule Your First Mock Interview
          </Button>
        </div>
      )}
    </div>
  );
};

export default MockSessions;
