import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Bell,
  Settings2,
  Shield,
  Save,
  Camera,
  Mail,
  Lock,
  Trash2,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface UserPreferences {
  emailNotifications: boolean;
  practiceReminders: boolean;
  weeklyDigest: boolean;
  feedbackAlerts: boolean;
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  sessionDuration: number;
  autoRecordSessions: boolean;
  showCheatingAlerts: boolean;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    practiceReminders: true,
    weeklyDigest: false,
    feedbackAlerts: true,
    defaultDifficulty: 'medium',
    sessionDuration: 30,
    autoRecordSessions: true,
    showCheatingAlerts: true,
  });

  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Check email verification status
        setIsEmailVerified(user.email_confirmed_at !== null);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch preferences from database
        const { data: prefsData, error: prefsError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefsError && prefsError.code !== 'PGRST116') {
          console.error('Error fetching preferences:', prefsError);
        }

        if (prefsData) {
          setPreferences({
            emailNotifications: prefsData.email_notifications,
            practiceReminders: prefsData.practice_reminders,
            weeklyDigest: prefsData.weekly_digest,
            feedbackAlerts: prefsData.feedback_alerts,
            defaultDifficulty: prefsData.default_difficulty as 'easy' | 'medium' | 'hard',
            sessionDuration: prefsData.session_duration,
            autoRecordSessions: prefsData.auto_record_sessions,
            showCheatingAlerts: prefsData.show_cheating_alerts,
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    if (!user) return;

    setSavingPreferences(true);
    try {
      const prefsData = {
        user_id: user.id,
        email_notifications: preferences.emailNotifications,
        practice_reminders: preferences.practiceReminders,
        weekly_digest: preferences.weeklyDigest,
        feedback_alerts: preferences.feedbackAlerts,
        default_difficulty: preferences.defaultDifficulty,
        session_duration: preferences.sessionDuration,
        auto_record_sessions: preferences.autoRecordSessions,
        show_cheating_alerts: preferences.showCheatingAlerts,
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert(prefsData, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Preferences saved',
        description: 'Your preferences have been synced to your account.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleSendVerificationOtp = async () => {
    if (!user?.email) return;

    setSendingOtp(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;

      setShowOtpInput(true);
      toast({
        title: 'Verification email sent',
        description: 'Please check your email for the verification code.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification email.',
        variant: 'destructive',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!user?.email || otp.length !== 6) return;

    setVerifyingEmail(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      setIsEmailVerified(true);
      setShowOtpInput(false);
      setOtp('');
      toast({
        title: 'Email verified!',
        description: 'Your email has been successfully verified.',
      });
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid or expired code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Interview
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Shield className="w-4 h-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and public profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-neon-magenta flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-foreground">Profile Photo</p>
                  <p className="text-sm text-muted-foreground">
                    Click to upload a new photo
                  </p>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Form Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={profile?.full_name || ''}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, full_name: e.target.value } : null
                      )
                    }
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    value={profile?.username || ''}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, username: e.target.value } : null
                      )
                    }
                    className="glass"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{user?.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed directly. Contact support if needed.
                </p>
              </div>

              <Button onClick={handleProfileUpdate} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about your practice sessions
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <Separator className="bg-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Practice Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Daily reminders to keep practicing
                    </p>
                  </div>
                  <Switch
                    checked={preferences.practiceReminders}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, practiceReminders: checked }))
                    }
                  />
                </div>

                <Separator className="bg-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Weekly Digest</p>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of your progress
                    </p>
                  </div>
                  <Switch
                    checked={preferences.weeklyDigest}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, weeklyDigest: checked }))
                    }
                  />
                </div>

                <Separator className="bg-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Feedback Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Notifications when AI feedback is ready
                    </p>
                  </div>
                  <Switch
                    checked={preferences.feedbackAlerts}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, feedbackAlerts: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handlePreferencesUpdate} disabled={savingPreferences}>
                {savingPreferences ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interview Settings Tab */}
        <TabsContent value="interview" className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Interview Settings
              </CardTitle>
              <CardDescription>
                Customize your interview practice experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Difficulty</Label>
                  <Select
                    value={preferences.defaultDifficulty}
                    onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                      setPreferences((prev) => ({ ...prev, defaultDifficulty: value }))
                    }
                  >
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy - Beginner friendly</SelectItem>
                      <SelectItem value="medium">Medium - Balanced challenge</SelectItem>
                      <SelectItem value="hard">Hard - Expert level</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Sets the default difficulty for new practice sessions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Session Duration</Label>
                  <Select
                    value={preferences.sessionDuration.toString()}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, sessionDuration: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Default length for practice sessions
                  </p>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto-Record Sessions</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically record audio during interviews
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoRecordSessions}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, autoRecordSessions: checked }))
                    }
                  />
                </div>

                <Separator className="bg-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Cheating Detection Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Show alerts for tab switching and looking away
                    </p>
                  </div>
                  <Switch
                    checked={preferences.showCheatingAlerts}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, showCheatingAlerts: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handlePreferencesUpdate} disabled={savingPreferences}>
                {savingPreferences ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingPreferences ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Account Security
              </CardTitle>
              <CardDescription>
                Manage your account security and session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Password</p>
                      <p className="text-sm text-muted-foreground">
                        Last changed: Never
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </div>

                {/* Email Verification Section */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Email</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    {isEmailVerified ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/20 text-success">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/20 text-warning">
                        <AlertCircle className="w-3 h-3" />
                        Not Verified
                      </span>
                    )}
                  </div>

                  {!isEmailVerified && (
                    <div className="space-y-4 pt-2">
                      {!showOtpInput ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSendVerificationOtp}
                          disabled={sendingOtp}
                        >
                          {sendingOtp ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Verify Email'
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              Enter the 6-digit code sent to your email
                            </Label>
                            <InputOTP
                              maxLength={6}
                              value={otp}
                              onChange={(value) => setOtp(value)}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleVerifyOtp}
                              disabled={verifyingEmail || otp.length !== 6}
                            >
                              {verifyingEmail ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify Code'
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowOtpInput(false);
                                setOtp('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Didn't receive the code?{' '}
                            <button
                              onClick={handleSendVerificationOtp}
                              disabled={sendingOtp}
                              className="text-primary hover:underline"
                            >
                              Resend
                            </button>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Session</h3>
                <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <h3 className="font-medium text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
