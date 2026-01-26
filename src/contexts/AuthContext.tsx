import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  business_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'dispatcher' | 'technician';
  is_active: boolean;
}

interface Business {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  business: Business | null;
  loading: boolean;
  needsOnboarding: boolean;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  createBusiness: (businessName: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      return profileData as UserProfile | null;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const fetchBusiness = async (businessId: string) => {
    try {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (businessError) {
        console.error('Error fetching business:', businessError);
        return null;
      }

      return businessData as Business | null;
    } catch (error) {
      console.error('Error in fetchBusiness:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
    
    if (profileData?.business_id) {
      const businessData = await fetchBusiness(profileData.business_id);
      setBusiness(businessData);
      setNeedsOnboarding(false);
    } else {
      setBusiness(null);
      setNeedsOnboarding(true);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            const profileData = await fetchProfile(currentSession.user.id);
            setProfile(profileData);
            
            if (profileData?.business_id) {
              const businessData = await fetchBusiness(profileData.business_id);
              setBusiness(businessData);
              setNeedsOnboarding(false);
            } else {
              setBusiness(null);
              setNeedsOnboarding(true);
            }
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setBusiness(null);
          setNeedsOnboarding(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!currentSession) {
        setLoading(false);
      }
      // Auth state change will handle the rest
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    metadata?: { first_name?: string; last_name?: string }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: metadata,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setBusiness(null);
    setNeedsOnboarding(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const createBusiness = async (
    businessName: string, 
    firstName?: string, 
    lastName?: string, 
    phone?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('create_business_with_owner', {
        p_business_name: businessName,
        p_user_first_name: firstName || null,
        p_user_last_name: lastName || null,
        p_user_phone: phone || null,
      });

      if (error) {
        return { error: error as Error };
      }

      // Refresh profile and business data
      await refreshProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    profile,
    business,
    loading,
    needsOnboarding,
    signUp,
    signIn,
    signOut,
    resetPassword,
    createBusiness,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
