import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '@/api/auth.api';
import { setAccessToken, getAccessToken } from '@/api/axios';
import { AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: getAccessToken(),
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const response = await authApi.getMe();
      if (response.success && response.data) {
        setState({
          user: response.data,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch {
      setAccessToken(null);
      setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<string> => {
    const response = await authApi.login(email, password);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }

    setAccessToken(response.data.accessToken);
    setState({
      user: response.data.user,
      accessToken: response.data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });

    return response.data.redirectTo;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
