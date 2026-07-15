import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login as apiLogin, logout as apiLogout } from "../api/auth";
import { loadSession, type Session } from "../api/client";

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    firmaKodu: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const login = useCallback(
    async (email: string, password: string, firmaKodu: string) => {
      const { session: next } = await apiLogin(email, password, firmaKodu);
      setSession(next);
    },
    [],
  );

  const logout = useCallback(() => {
    apiLogout();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth yalnızca AuthProvider içinde");
  return ctx;
}
