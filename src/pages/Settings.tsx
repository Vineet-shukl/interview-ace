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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (data) {
          setProfile(data);
        }

        // Load preferences from localStorage
        const savedPrefs = localStorage.getItem(`preferences_${user.id}`);
        if (savedPrefs) {
          setPreferences(JSON.parse(savedPrefs));
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
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

  const handlePreferencesUpdate = () => {
    if (!user) return;

    localStorage.setItem(`preferences_${user.id}`, JSON.stringify(preferences));
    toast({
      title: 'Preferences saved',
      description: 'Your preferences have been updated.',
    });
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

              <Button onClick={handlePreferencesUpdate}>
                <Save className="w-4 h-4" />
                Save Preferences
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

              <Button onClick={handlePreferencesUpdate}>
                <Save className="w-4 h-4" />
                Save Settings
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

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">
                    Verified
                  </span>
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
