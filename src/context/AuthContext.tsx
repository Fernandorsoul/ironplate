import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as Storage from '../services/storage';
import * as Database from '../services/database';

interface AuthContextType {
  userId: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await Database.authenticateUser(email, password);
      if (!user) return false;
      setUserId(user.id);
      await Storage.saveUserId(user.id);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const user = await Database.createUser(name, email, password);
      if (!user) return false;
      setUserId(user.id);
      await Storage.saveUserId(user.id);
      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setUserId(null);
    await Storage.removeUserId();
  }, []);

  return (
    <AuthContext.Provider value={{ userId, isAuthenticated: !!userId, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
