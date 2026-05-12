import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Mirrors the `profiles` table in app/migrations/001_initial_schema.sql.
// All fields are optional because the trigger inserts a near-empty row on signup
// and onboarding fills the rest, so any field can be unset at read time.
export interface Profile {
  id?: string;
  full_name?: string;
  home_country?: string;
  home_region?: string;
  home_cuisines?: string[];
  repertoire?: string[];
  preferred_language?: string;
  dietary_preferences?: string[];
  allergies?: string[];
  cooking_confidence?: number;
  home_lat?: number;
  home_lng?: number;
  home_city?: string;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  // undefined = still loading; null = fetch failed; {} = signed in but no profile row yet.
  profile: Profile | null | undefined;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    setProfile(undefined);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Profile fetch error:', error);
        }
        // Use {} instead of null so App.tsx can distinguish "loaded but no profile"
        // from "still loading" (undefined). !profile?.onboarding_completed stays truthy
        // for {}, routing the user through onboarding correctly.
        setProfile({});
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };


  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
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
