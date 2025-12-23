import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Bell,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Invite {
  id: string;
  session_id: string;
  inviter_id: string;
  invitee_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  type: 'sent' | 'received';
}

const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchInvites = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch sent invites
      const { data: sentData } = await supabase
        .from('mock_interview_invites')
        .select('*')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch received invites
      const { data: receivedData } = await supabase
        .from('mock_interview_invites')
        .select('*')
        .eq('invitee_email', user.email || '')
        .order('created_at', { ascending: false })
        .limit(20);

      const sent = (sentData || []).map((inv) => ({ ...inv, type: 'sent' as const }));
      const received = (receivedData || []).map((inv) => ({ ...inv, type: 'received' as const }));

      // Combine and sort by date
      const combined = [...sent, ...received].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setInvites(combined.slice(0, 30));
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvites();
    }
  }, [isOpen, user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('invite-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mock_interview_invites',
        },
        () => {
          if (isOpen) {
            fetchInvites();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen]);

  const getStatusIcon = (status: string, type: 'sent' | 'received') => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <UserPlus className="w-4 h-4 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/20 text-warning',
      accepted: 'bg-success/20 text-success',
      declined: 'bg-destructive/20 text-destructive',
    };

    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', styles[status] || styles.pending)}>
        {status}
      </span>
    );
  };

  const getMessage = (invite: Invite) => {
    if (invite.type === 'sent') {
      switch (invite.status) {
        case 'accepted':
          return `${invite.invitee_email} accepted your invite`;
        case 'declined':
          return `${invite.invitee_email} declined your invite`;
        default:
          return `Invite sent to ${invite.invitee_email}`;
      }
    } else {
      switch (invite.status) {
        case 'accepted':
          return 'You accepted this mock interview invite';
        case 'declined':
          return 'You declined this mock interview invite';
        default:
          return 'You received a mock interview invite';
      }
    }
  };

  const pendingCount = invites.filter(
    (inv) => inv.status === 'pending' && inv.type === 'received'
  ).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Invite someone to practice together!
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/mock-sessions');
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Mock Interview
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={`${invite.type}-${invite.id}`}
                  className={cn(
                    'p-4 rounded-xl border transition-colors cursor-pointer hover:bg-accent/50',
                    invite.status === 'pending' && invite.type === 'received'
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-card border-border'
                  )}
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/mock-sessions');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        invite.type === 'sent' ? 'bg-primary/10' : 'bg-neon-magenta/10'
                      )}
                    >
                      {invite.type === 'sent' ? (
                        <UserPlus className={cn('w-5 h-5', invite.type === 'sent' ? 'text-primary' : 'text-neon-magenta')} />
                      ) : (
                        getStatusIcon(invite.status, invite.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground uppercase font-medium">
                          {invite.type === 'sent' ? 'Sent' : 'Received'}
                        </span>
                        {getStatusBadge(invite.status)}
                      </div>
                      <p className="text-sm text-foreground mt-1 line-clamp-2">
                        {getMessage(invite)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
