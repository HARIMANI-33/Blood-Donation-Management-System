import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, LoginInput, RegisterInput } from '../types/auth';
import { loginUser, registerUser, googleAuthUser } from '../services/auth.service';
import { ApiError } from '../services/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewRegistration: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  googleLogin: (payload: { token?: string; credential?: string; accessToken?: string; access_token?: string }) => Promise<void>;
  loginWithSession: (sessionUser: User, sessionToken: string) => void;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'bloodbank_auth';

interface StoredAuth {
  user: User;
  token: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewRegistration, setIsNewRegistration] = useState<boolean>(() => {
    return sessionStorage.getItem('lifeflow_is_new_reg') === 'true';
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: StoredAuth = JSON.parse(raw);
        setUser(parsed.user);
        setToken(parsed.token);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const persist = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  };

  const login = useCallback(async (input: LoginInput) => {
    const response = await loginUser(input);
    if (!response.data) {
      throw new ApiError(response.message || 'Login failed', 400);
    }
    setIsNewRegistration(false);
    sessionStorage.removeItem('lifeflow_is_new_reg');
    persist(response.data.user, response.data.token);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await registerUser(input);
    if (!response.data) {
      throw new ApiError(response.message || 'Registration failed', 400);
    }
    setIsNewRegistration(true);
    sessionStorage.setItem('lifeflow_is_new_reg', 'true');
    persist(response.data.user, response.data.token);
  }, []);

  const googleLogin = useCallback(async (payload: { token?: string; credential?: string; accessToken?: string; access_token?: string }) => {
    const response = await googleAuthUser(payload);
    if (!response.data) {
      throw new ApiError(response.message || 'Google authentication failed', 400);
    }
    setIsNewRegistration(false);
    sessionStorage.removeItem('lifeflow_is_new_reg');
    persist(response.data.user, response.data.token);
  }, []);

  const loginWithSession = useCallback((sessionUser: User, sessionToken: string) => {
    setIsNewRegistration(true);
    sessionStorage.setItem('lifeflow_is_new_reg', 'true');
    persist(sessionUser, sessionToken);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: StoredAuth = JSON.parse(raw);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updatedUser, token: parsed.token }));
      } catch {
        // ignore
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsNewRegistration(false);
    sessionStorage.removeItem('lifeflow_is_new_reg');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        isNewRegistration,
        login,
        register,
        googleLogin,
        loginWithSession,
        updateUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
