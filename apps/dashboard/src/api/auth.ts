import { apiConfig, endpoints } from "./config";
import {
  clearSession,
  gatewayFetch,
  saveSession,
  type Session,
} from "./client";
import { mockLogin } from "./mock";

export interface LoginResult {
  session: Session;
  source: "mock" | "live";
}

/**
 * POST /auth/login
 * Body (hazır): { email, password, firmaKodu }
 * Gateway şu an email+password zorunlu; firmaKodu tenant seçimi için gönderilir.
 */
export async function login(
  email: string,
  password: string,
  firmaKodu: string,
): Promise<LoginResult> {
  if (apiConfig.useMock) {
    const user = mockLogin(email, password, firmaKodu);
    const session: Session = {
      user,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      firmaKodu: firmaKodu.trim().toLowerCase() || user.tenantSlug,
    };
    saveSession(session);
    return { session, source: "mock" };
  }

  const data = await gatewayFetch<{
    user: Session["user"];
    accessToken: string;
    refreshToken: string;
  }>(endpoints.login, {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      firmaKodu: firmaKodu.trim(),
      tenantSlug: firmaKodu.trim(),
    }),
  });

  const session: Session = {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    firmaKodu: firmaKodu.trim() || data.user.tenantSlug,
  };
  saveSession(session);
  return { session, source: "live" };
}

export function logout(): void {
  clearSession();
}
