/**
 * Auth context — manages JWT token, current user, and sign-in state.
 * Token is persisted in AsyncStorage so the user stays signed in across app restarts.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken } from '../api';

const TOKEN_KEY = 'everyday_ai_token';

type User = {
  id: string;
  email: string;
  role: 'customer' | 'provider' | 'admin' | 'support';
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  restoreToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreToken = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        setTokenState(stored);
        setToken(stored);
        const res = await api.auth.me();
        if (res.ok) {
          const data = await res.json();
          setUser(data.user as User);
        }
      }
    } catch {
      // ignore restore errors — user will see sign-in screen
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  const signIn = useCallback((t: string, u: User) => {
    setTokenState(t);
    setToken(t);
    setUser(u);
    AsyncStorage.setItem(TOKEN_KEY, t);
  }, []);

  const signOut = useCallback(async () => {
    setTokenState(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut, restoreToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
