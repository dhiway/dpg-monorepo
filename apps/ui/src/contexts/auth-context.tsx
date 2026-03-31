import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSession, signOut as apiSignOut, type User } from '@/lib/auth-api';
import { setAuthToken, clearAuthToken } from '@/lib/auth-token';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkUser: (phoneNumber: string) => Promise<boolean>;
  requestOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, otp: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const session = await getSession();
      if (session.token) {
        setAuthToken(session.token);
      }
      setUser(session.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const checkUser = useCallback(async (phoneNumber: string): Promise<boolean> => {
    const { checkUser: checkUserApi } = await import('@/lib/auth-api');
    const response = await checkUserApi(phoneNumber);
    return response.userExists;
  }, []);

  const requestOtp = useCallback(async (phoneNumber: string): Promise<void> => {
    const { requestOtp: requestOtpApi } = await import('@/lib/auth-api');
    await requestOtpApi(phoneNumber);
  }, []);

  const verifyOtp = useCallback(async (phoneNumber: string, otp: string, name?: string): Promise<void> => {
    const { verifyOtp: verifyOtpApi } = await import('@/lib/auth-api');
    const response = await verifyOtpApi(phoneNumber, otp, name);
    setAuthToken(response.token);
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiSignOut();
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        checkUser,
        requestOtp,
        verifyOtp,
        signOut,
      }}
    >
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
