
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { initializeAppDataService, setOnlineStatus as setGlobalOnlineStatus } from '@/services/appDataService'; // Import appDataService functions

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<{ error: Error | null }>;
  isOnline: boolean; // Add isOnline state
  toggleOnlineMode: () => void; // Add toggle function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true); // App starts in online mode by default

  useEffect(() => {
    setLoading(true);
    // Set initial online status for appDataService
    setGlobalOnlineStatus(isOnline); 
    
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);
      initializeAppDataService(currentUser?.id ?? null); // Initialize with current user ID
      setLoading(false);

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, currentSession) => {
          setSession(currentSession);
          const updatedUser = currentSession?.user ?? null;
          setUser(updatedUser);
          initializeAppDataService(updatedUser?.id ?? null); // Re-initialize on auth change
          if (loading) setLoading(false); 
        }
      );
      return () => {
        authListener?.subscription.unsubscribe();
      };
    });    
  }, [isOnline, loading]); // Added isOnline to ensure appDataService is updated if it changes

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    // User state will be cleared by onAuthStateChange, which also calls initializeAppDataService(null)
    setLoading(false);
    return { error };
  };

  const toggleOnlineMode = () => {
    setIsOnline(prevIsOnline => {
      const newIsOnline = !prevIsOnline;
      setGlobalOnlineStatus(newIsOnline); // Update global appDataService status
      // Here you might trigger sync logic if transitioning from offline to online
      console.log("Online mode toggled to:", newIsOnline);
      return newIsOnline;
    });
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    isOnline,
    toggleOnlineMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }