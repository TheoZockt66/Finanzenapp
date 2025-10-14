'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, FINANZEN_FUNCTIONS } from '../lib/supabase';
import { notifications } from '@mantine/notifications';

// Hilfsfunktion für sichere Notifications
const safeNotification = (options: {
  title: string;
  message: string;
  color: 'red' | 'green' | 'blue' | 'yellow';
}) => {
  if (typeof window !== 'undefined') {
    notifications.show(options);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Hilfsfunktion zum Löschen korrupter Session-Daten
  const clearCorruptedSession = async () => {
    try {
      console.log('🧹 Clearing corrupted session...');
      
      // Vollständiges Clearing aller Session-Daten
      await supabase.auth.signOut({ scope: 'global' });
      
      // Zusätzlich localStorage bereinigen falls nötig
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('sb-*');
        } catch (storageError) {
          console.log('Storage cleanup skipped:', storageError);
        }
      }
      
      // State sofort bereinigen
      setSession(null);
      setUser(null);
      
      console.log('✅ Session cleared successfully');
      
      // Benutzerfreundliche Benachrichtigung
      safeNotification({
        title: 'Session abgelaufen',
        message: 'Bitte melde dich erneut an.',
        color: 'yellow'
      });
      
    } catch (error) {
      console.error('Error clearing session:', error);
      // Fallback: Force state reset
      setSession(null);
      setUser(null);
    }
  };

  const createOrUpdateUserProfile = async (user: User) => {
    try {
      // Prüfe erst welche Spalten in der users Tabelle existieren
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id, email')  // Nur sichere Spalten auswählen
        .eq('id', user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found (ist OK)
        console.log('⚠️ Users table access limited:', selectError.message);
        return; // Gracefully skip if no access
      }

      const userNotFound = selectError?.code === 'PGRST116';

      // User-Daten für Insert/Update (nur sichere Felder)
      const userData = {
        id: user.id,
        email: user.email,
      };

      // Füge optionale Felder hinzu falls sie existieren (graceful degradation)
      try {
        if (!existingUser || userNotFound) {
          // User existiert noch nicht - versuche zu erstellen
          const { error: insertError } = await supabase
            .from('users')
            .insert(userData);

          if (insertError) {
            console.log('⚠️ Could not create user profile:', insertError.message);
          } else {
            console.log('✅ User profile created successfully');
          }
        } else {
          // User existiert - minimales update
          console.log('✅ User profile exists, no update needed');
        }
      } catch (dbError) {
        console.log('⚠️ Database operation skipped:', dbError);
      }
    } catch (error) {
      console.log('⚠️ Error in createOrUpdateUserProfile (non-critical):', error);
      // Non-critical error - app should continue to work
    }
  };

  const createDefaultCategoriesDirectly = async (userId: string) => {
    try {
      const defaultCategories = [
        { user_id: userId, name: 'Lebensmittel', color: 'green', is_default: true },
        { user_id: userId, name: 'Transport', color: 'blue', is_default: true },
        { user_id: userId, name: 'Unterhaltung', color: 'orange', is_default: true },
        { user_id: userId, name: 'Gesundheit', color: 'red', is_default: true },
        { user_id: userId, name: 'Bildung', color: 'purple', is_default: true },
        { user_id: userId, name: 'Kleidung', color: 'pink', is_default: true },
        { user_id: userId, name: 'Haushalt', color: 'cyan', is_default: true },
        { user_id: userId, name: 'Sonstiges', color: 'gray', is_default: true }
      ];

      const { error } = await supabase
        .from('finanzen_transaction_categories')
        .insert(defaultCategories);

      if (error) {
        console.log('⚠️ Could not create default categories directly:', error.message);
      } else {
        console.log('✅ Default categories created directly');
      }
    } catch (error) {
      console.log('⚠️ Error creating default categories directly:', error);
    }
  };

  const createDefaultFinanzenCategories = useCallback(async (userId: string) => {
    try {
      // Prüfe ob der User bereits Kategorien hat
      const { data: existingCategories, error: checkError } = await supabase
        .from('finanzen_transaction_categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (checkError) {
        console.log('⚠️ Could not check existing categories:', checkError.message);
        return;
      }

      // Wenn bereits Kategorien existieren, nichts tun
      if (existingCategories && existingCategories.length > 0) {
        console.log('✅ User already has categories, skipping default creation');
        return;
      }

      // Erstelle Default-Kategorien mit der Database Function
      const { error: functionError } = await supabase.rpc(
        FINANZEN_FUNCTIONS.CREATE_DEFAULT_CATEGORIES,
        { user_uuid: userId }
      );

      if (functionError) {
        console.log('⚠️ Could not create default categories via function:', functionError.message);
        
        // Fallback: Erstelle Kategorien direkt
        await createDefaultCategoriesDirectly(userId);
      } else {
        console.log('✅ Default finanzen categories created successfully');
      }
    } catch (error) {
      console.log('⚠️ Error in createDefaultFinanzenCategories (non-critical):', error);
    }
  }, []);

  useEffect(() => {
    // Build-Zeit-Schutz: Nur im Browser ausführen
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          
          // Handle verschiedene Arten von Auth-Fehlern
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('Refresh Token Not Found') ||
              error.name === 'AuthApiError') {
            console.log('🔄 Authentication error detected, clearing session...');
            await clearCorruptedSession();
            return; // Early return da Session bereits gecleared
          }
        } else if (session) {
          // Prüfe ob Session noch gültig ist
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
              console.log('🔄 Session validation failed, clearing...');
              await clearCorruptedSession();
              return;
            }
          } catch {
            console.log('🔄 Session validation error, clearing...');
            await clearCorruptedSession();
            return;
          }
          
          setSession(session);
          setUser(session.user);
        } else {
          // Keine Session vorhanden
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Unexpected error during session retrieval:', error);
        // Clear potentially corrupted session
        await clearCorruptedSession();
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🔐 Auth state changed:', event, session?.user?.id ? 'User logged in' : 'No user');
        
        try {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          if (event === 'SIGNED_IN') {
            // Erstelle oder aktualisiere User-Profil und erstelle Default-Kategorien
            if (session?.user) {
              await createOrUpdateUserProfile(session.user);
              await createDefaultFinanzenCategories(session.user.id);
            }
          }

          if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed successfully');
          }

          if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            setSession(null);
            setUser(null);
          }
        } catch (authError) {
          console.error('Error in auth state change handler:', authError);
          // Bei Auth-Fehlern Session bereinigen
          if (authError instanceof Error && 
              (authError.message.includes('refresh_token_not_found') ||
               authError.message.includes('Invalid Refresh Token'))) {
            await clearCorruptedSession();
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [createDefaultFinanzenCategories]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      safeNotification({
        title: 'Anmeldung fehlgeschlagen',
        message: error.message,
        color: 'red'
      });
    } else {
      safeNotification({
        title: 'Willkommen zurück!',
        message: 'Du wurdest erfolgreich angemeldet.',
        color: 'green'
      });
    }

    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    });

    if (error) {
      safeNotification({
        title: 'Registrierung fehlgeschlagen',
        message: error.message,
        color: 'red'
      });
    } else {
      safeNotification({
        title: 'Registrierung erfolgreich!',
        message: 'Bitte überprüfe deine E-Mail für die Bestätigung.',
        color: 'green'
      });
    }

    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Explizites Sign-out mit vollständiger Bereinigung
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // State sofort bereinigen
      setSession(null);
      setUser(null);
      
      safeNotification({
        title: 'Auf Wiedersehen!',
        message: 'Du wurdest erfolgreich abgemeldet.',
        color: 'blue'
      });
      
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) {
      safeNotification({
        title: 'Fehler',
        message: error.message,
        color: 'red'
      });
    } else {
      safeNotification({
        title: 'E-Mail gesendet',
        message: 'Überprüfe deine E-Mail für den Passwort-Reset-Link.',
        color: 'green'
      });
    }

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}