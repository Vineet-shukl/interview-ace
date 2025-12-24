import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { full_name?: string; username?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Device detection utilities
const generateFingerprint = (): string => {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown Browser';
};

const getOSInfo = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown OS';
};

const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Mobile')) return 'Mobile Device';
  if (ua.includes('Tablet') || ua.includes('iPad')) return 'Tablet';
  return 'Desktop';
};

const getIPAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'Unknown';
  }
};

const checkAndRegisterDevice = async (userId: string, userEmail: string, userName: string) => {
  try {
    const deviceFingerprint = generateFingerprint();
    const browser = getBrowserInfo();
    const os = getOSInfo();
    const deviceName = getDeviceName();
    const ipAddress = await getIPAddress();

    // Check if device exists
    const { data: existingDevice, error: fetchError } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking device:', fetchError);
      return;
    }

    if (existingDevice) {
      // Update last login time
      await supabase
        .from('user_devices')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', existingDevice.id);
      return;
    }

    // New device - register it
    const { error: insertError } = await supabase
      .from('user_devices')
      .insert({
        user_id: userId,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        browser,
        os,
        ip_address: ipAddress,
      });

    if (insertError) {
      console.error('Error registering device:', insertError);
      return;
    }

    // Send notification email for new device
    await supabase.functions.invoke('login-notification', {
      body: {
        userEmail,
        userName,
        deviceName,
        browser,
        os,
        ipAddress,
        loginTime: new Date().toLocaleString(),
      },
    });
    console.log('Login notification sent for new device');
  } catch (error) {
    console.error('Error in device detection:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check for new device on sign in
        if (event === 'SIGNED_IN' && session?.user) {
          const userName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email?.split('@')[0] || '';
          
          // Use setTimeout to avoid blocking auth state change
          setTimeout(() => {
            checkAndRegisterDevice(
              session.user.id,
              session.user.email || '',
              userName
            );
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: { full_name?: string; username?: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    // Use VITE_SITE_URL for production, fallback to current origin for development
    const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect to /auth so the auth state change handler properly navigates
        redirectTo: `${baseUrl}/auth`
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
