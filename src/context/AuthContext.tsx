import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StoreSettings } from '../types';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../api';

interface AuthContextType {
  user: User | null;
  settings: StoreSettings | null;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  login: (email: string, password: string) => Promise<void>;
  registerWithInvite: (data: { inviteCode: string; email: string; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  demoSwitch: (role: 'admin' | 'client') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('inicio');

  const checkAuth = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        // Auto-switch to client demo user by default if not logged in for instant preview
        const demoRes = await api.auth.demoSwitch('client');
        setAuthToken(demoRes.token);
        setUser(demoRes.user);
        setSettings(demoRes.settings);
        setIsLoading(false);
        return;
      }

      const res = await api.auth.me();
      setUser(res.user);
      setSettings(res.settings);
    } catch {
      clearAuthToken();
      // Fallback to client demo
      try {
        const demoRes = await api.auth.demoSwitch('client');
        setAuthToken(demoRes.token);
        setUser(demoRes.user);
        setSettings(demoRes.settings);
      } catch {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      setAuthToken(res.token);
      setUser(res.user);
      const s = await api.settings.get();
      setSettings(s);
      setActiveTab('inicio');
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithInvite = async (data: { inviteCode: string; email: string; name: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.registerWithInvite(data);
      setAuthToken(res.token);
      setUser(res.user);
      const s = await api.settings.get();
      setSettings(s);
      setActiveTab('inicio');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      setUser(null);
      setActiveTab('inicio');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.me();
      setUser(res.user);
      setSettings(res.settings);
    } catch {
      // ignore
    }
  };

  const refreshSettings = async () => {
    try {
      const s = await api.settings.get();
      setSettings(s);
    } catch {
      // ignore
    }
  };

  const demoSwitch = async (role: 'admin' | 'client') => {
    setIsLoading(true);
    try {
      const res = await api.auth.demoSwitch(role);
      setAuthToken(res.token);
      setUser(res.user);
      setSettings(res.settings);
      setActiveTab(role === 'admin' ? 'admin' : 'inicio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        isLoading,
        activeTab,
        setActiveTab,
        login,
        registerWithInvite,
        logout,
        refreshUser,
        refreshSettings,
        demoSwitch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
