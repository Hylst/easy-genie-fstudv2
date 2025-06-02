
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { initializeAppDataService, setOnlineStatus as setGlobalOnlineStatus, setCurrentUserId as setGlobalUserId, getOnlineStatus } from '@/services/appDataService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<{ error: Error | null }>;
  isOnline: boolean;
  toggleOnlineMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Initialize isOnline from appDataService's current state or default to true
  const [isOnline, setIsOnline] = useState(getOnlineStatus()); 


  const updateAuthData = useCallback((currentSession: Session | null) => {
    setLoading(true);
    setSession(currentSession);
    const updatedUser = currentSession?.user ?? null;
    setUser(updatedUser);
    setGlobalUserId(updatedUser?.id ?? null); // Set global user ID for appDataService
    // Pass current isOnline state when initializing/re-initializing
    initializeAppDataService(updatedUser?.id ?? null, isOnline); 
    setLoading(false);
  }, [isOnline]); // isOnline is a dependency for re-initialization if it changes

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      updateAuthData(initialSession);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        updateAuthData(currentSession);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [updateAuthData]); // updateAuthData is stable due to useCallback

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    // User state will be cleared by onAuthStateChange calling updateAuthData with a null session.
    // This also handles re-initializing AppDataService with null user and current online state.
    if (error) {
      setLoading(false); // Ensure loading is false if sign out fails
    }
    return { error };
  };

  const toggleOnlineMode = () => {
    setIsOnline(prevIsOnline => {
      const newIsOnline = !prevIsOnline;
      setGlobalOnlineStatus(newIsOnline);
      // Re-initialize appDataService with the new online status and current user
      initializeAppDataService(user?.id ?? null, newIsOnline);
      console.log("AuthContext: Online mode toggled by user to:", newIsOnline);
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
  return context;
};
