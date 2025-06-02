
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Check initial session on component mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      // Listen for auth state changes after initial check
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, currentSession) => {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          // Ensure loading is false after updates too, though initial load is primary concern
          if (loading) setLoading(false); 
        }
      );
      return () => {
        authListener?.subscription.unsubscribe();
      };
    });    
  }, [loading]); // Added loading to dependency array of outer useEffect for clarity, though its direct re-trigger might be minimal

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    // State updates (setUser, setSession) will be handled by onAuthStateChange listener
    setLoading(false);
    return { error };
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  // Only render children once initial loading is complete to avoid unauthenticated flashes
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
