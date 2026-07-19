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
 * Body: { identifier, password } — identifier: e-posta | telefon | TCKN | VKN
 * Geriye uyum: email alanı da kabul edilir.
 */
export async function login(
  identifier: string,
  password: string,
  firmaKodu?: string,
): Promise<LoginResult> {
  if (apiConfig.useMock) {
    const user = mockLogin(identifier, password, firmaKodu);
    const session: Session = {
      user,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      firmaKodu: (firmaKodu ?? "").trim().toLowerCase() || user.tenantSlug,
    };
    saveSession(session);
    return { session, source: "mock" };
  }

  const body: Record<string, string> = {
    identifier: identifier.trim(),
    password,
  };
  if (firmaKodu?.trim()) {
    body.firmaKodu = firmaKodu.trim();
  }

  const data = await gatewayFetch<{
    user: Session["user"];
    accessToken: string;
    refreshToken: string;
  }>(endpoints.login, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const session: Session = {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    firmaKodu: (firmaKodu ?? "").trim() || data.user.tenantSlug,
  };
  saveSession(session);
  return { session, source: "live" };
}

export function logout(): void {
  clearSession();
}
