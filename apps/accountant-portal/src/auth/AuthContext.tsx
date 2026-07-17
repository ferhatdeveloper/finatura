import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiConfig } from "../api/config";
import { purgeInvalidAccountantSession } from "../api/client";
import { loginWithGatewayOrMock, isAccountantRole } from "./loginApi";
import { clearSession, loadSession, saveSession } from "./storage";
import type { AuthSession, AuthUser, LoginRequest } from "./types";
import { AuthError } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isAccountant: boolean;
  ready: boolean;
  login: (req: LoginRequest) => Promise<AuthSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (apiConfig.authMode !== "mock") purgeInvalidAccountantSession();
    return loadSession();
  });
  const [ready] = useState(true);

  const login = useCallback(async (req: LoginRequest) => {
    const { response, source } = await loginWithGatewayOrMock(req);
    const next: AuthSession = {
      user: response.user,
      tokens: {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType,
        expiresIn: response.expiresIn,
      },
      source,
    };
    saveSession(next);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthenticated: Boolean(session?.user),
      isAccountant: isAccountantRole(session?.user?.role),
      ready,
      login,
      logout,
    }),
    [session, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth yalnızca AuthProvider içinde kullanılabilir.");
  }
  return ctx;
}

export { AuthError, isAccountantRole };
