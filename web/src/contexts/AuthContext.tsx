import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { REST_URL } from '@/config';

interface User {
  id?: number;
  documentId: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserPreferenceKey = (user: Partial<User> | null | undefined) => {
  if (!user) {
    return null;
  }

  if (user.documentId) {
    return `profile:${user.documentId}`;
  }

  if (typeof user.id === 'number') {
    return `profile:id:${user.id}`;
  }

  return null;
};

const withStoredProfilePrefs = (user: any): User => {
  const safeUser = {
    ...user,
  } as User;

  const key = getUserPreferenceKey(safeUser);
  if (!key) {
    return safeUser;
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return safeUser;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...safeUser,
      avatarUrl: parsed?.avatarUrl || safeUser.avatarUrl,
    };
  } catch {
    return safeUser;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('jwt');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(withStoredProfilePrefs(parsedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);

      if (response.status !== 401) {
        return response;
      }

      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      const isAuthEndpoint =
        requestUrl.includes('/auth/local') ||
        requestUrl.includes('/auth/local/register') ||
        requestUrl.includes('/auth/forgot-password') ||
        requestUrl.includes('/auth/reset-password');

      if (!isAuthEndpoint && localStorage.getItem('jwt')) {
        clearAuthState();
        sessionStorage.setItem('auth:sessionExpired', '1');

        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [clearAuthState]);

  const login = async (identifier: string, password: string) => {
    const response = await fetch(`${REST_URL}/auth/local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Login failed');
    }

    const data = await response.json();
    const nextUser = withStoredProfilePrefs(data.user);
    localStorage.setItem('jwt', data.jwt);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await fetch(`${REST_URL}/auth/local/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Registration failed');
    }

    const data = await response.json();
    const nextUser = withStoredProfilePrefs(data.user);
    localStorage.setItem('jwt', data.jwt);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) {
        return prev;
      }

      const next = {
        ...prev,
        ...updates,
      };

      localStorage.setItem('user', JSON.stringify(next));

      const prefKey = getUserPreferenceKey(next);
      if (prefKey) {
        localStorage.setItem(
          prefKey,
          JSON.stringify({
            avatarUrl: next.avatarUrl || '',
          }),
        );
      }

      return next;
    });
  };

  const logout = () => {
    clearAuthState();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateUser, logout, isLoading }}>
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
