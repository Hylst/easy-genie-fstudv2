
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { initializeAppDataService, setOnlineStatus as setGlobalOnlineStatus, setCurrentUserId as setGlobalUserId } from '@/services/appDataService';

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
  const [isOnline, setIsOnline] = useState(true); // App starts in online mode by default

  useEffect(() => {
    // This effect should run once on mount to get the initial session and set up the listener.
    // It will also re-run if isOnline changes, to update appDataService.
    
    setLoading(true); // Set loading true at the start of the effect
    setGlobalOnlineStatus(isOnline); 
    
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);
      setGlobalUserId(currentUser?.id ?? null); // Set user ID for appDataService
      initializeAppDataService(currentUser?.id ?? null);
      setLoading(false); // Set loading false after initial session is processed
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setLoading(true); // Set loading true before updating session/user
        setSession(currentSession);
        const updatedUser = currentSession?.user ?? null;
        setUser(updatedUser);
        setGlobalUserId(updatedUser?.id ?? null); // Update user ID for appDataService
        initializeAppDataService(updatedUser?.id ?? null);
        setLoading(false); // Set loading false after auth state change is processed
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isOnline]); // Removed 'loading' from dependencies. Only re-run if isOnline changes.

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    // User state will be cleared by onAuthStateChange, 
    // which also calls initializeAppDataService(null) and setLoading(false).
    // If onAuthStateChange doesn't fire immediately or robustly, explicitly clear here too:
    // setUser(null);
    // setSession(null);
    // setGlobalUserId(null);
    // initializeAppDataService(null);
    // setLoading(false); // This might be redundant if onAuthStateChange is reliable
    return { error };
  };

  const toggleOnlineMode = () => {
    setIsOnline(prevIsOnline => {
      const newIsOnline = !prevIsOnline;
      setGlobalOnlineStatus(newIsOnline);
      console.log("Online mode toggled to:", newIsOnline);
      // If transitioning to online, and user is logged in, one might trigger a sync here.
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

  // Render children only after initial loading is false to ensure context is fully initialized
  // This is a common pattern to avoid consuming context before it's ready.
  // However, if MagicHeader and other components are correctly handling the `loading` state from `useAuth()`,
  // this might not be strictly necessary and could cause a flicker if not handled carefully.
  // For now, let's trust the consumers to handle the loading state.
  // if (loading && session === null) { // A more specific condition might be needed
  // return null; // Or a global loading spinner
  // }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
