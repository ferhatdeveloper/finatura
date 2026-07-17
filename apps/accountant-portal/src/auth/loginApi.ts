import { apiConfig } from "../api/config";
import type { AuthUser, LoginRequest, LoginResponse } from "./types";
import { AuthError } from "./types";

/** Demo mali müşavir — yalnızca VITE_AUTH_MODE=mock */
export const MOCK_ACCOUNTANT = {
  email: "mm@finatura.app",
  password: "mali1234",
  phone: "5552223344",
  tckn: "10000000154",
  vergiNo: "9876543210",
  maliMusavirKodu: "MM-DEMO",
  firmaKodu: "ORNEK-GALERI",
} as const;

const MOCK_USER: AuthUser = {
  id: "00000000-0000-4000-8000-0000000000mm",
  email: MOCK_ACCOUNTANT.email,
  displayName: "Ayşe Yılmaz, SMMM",
  firmaUnvan: "Örnek Oto Galeri Ltd. Şti.",
  tenantId: "00000000-0000-4000-8000-0000000000aa",
  tenantSlug: "ornek-galeri",
  role: "accountant",
  maliMusavirKodu: MOCK_ACCOUNTANT.maliMusavirKodu,
  firmaKodu: MOCK_ACCOUNTANT.firmaKodu,
};

function gatewayBaseUrl(): string {
  return apiConfig.gatewayUrl;
}

function authMode(): "auto" | "mock" | "gateway" {
  const v = apiConfig.authMode;
  if (v === "mock" || v === "auto") return v;
  return "gateway";
}

function b64url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, "");
}

function normalizePhone(v: string): string {
  let d = digitsOnly(v);
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return d;
}

function resolveIdentifier(req: LoginRequest): string {
  return (req.identifier || req.email || "").trim();
}

/** Yalnızca VITE_AUTH_MODE=mock — gerçek imza yok */
function issueStubTokens(user: AuthUser): Omit<LoginResponse, "user"> {
  const header = b64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const accessPayload = b64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      role: user.role,
      typ: "access",
      iat: now,
      exp: now + 3600,
    }),
  );
  const refreshPayload = b64url(
    JSON.stringify({
      sub: user.id,
      typ: "refresh",
      iat: now,
      exp: now + 604800,
    }),
  );
  return {
    accessToken: `${header}.${accessPayload}.stub`,
    refreshToken: `${header}.${refreshPayload}.stub`,
    tokenType: "Bearer",
    expiresIn: 3600,
  };
}

function normalizeUser(
  raw: Record<string, unknown>,
  req: LoginRequest,
): AuthUser {
  const id = resolveIdentifier(req);
  return {
    id: String(raw.id ?? ""),
    email: String(raw.email ?? (id.includes("@") ? id : MOCK_ACCOUNTANT.email)),
    displayName: String(raw.displayName ?? raw.email ?? "Kullanıcı"),
    firmaUnvan: String(
      raw.firmaUnvan ?? raw.tenantSlug ?? req.firmaKodu ?? "Mükellef",
    ),
    tenantId: String(raw.tenantId ?? ""),
    tenantSlug: String(raw.tenantSlug ?? ""),
    role: String(raw.role ?? "member"),
    maliMusavirKodu: req.maliMusavirKodu,
    firmaKodu: req.firmaKodu,
  };
}

function mockLogin(req: LoginRequest): LoginResponse {
  const id = resolveIdentifier(req);
  const phone = normalizePhone(id);
  const digits = digitsOnly(id);
  const idOk =
    id.toLowerCase() === MOCK_ACCOUNTANT.email ||
    phone === MOCK_ACCOUNTANT.phone ||
    digits === MOCK_ACCOUNTANT.tckn ||
    digits === MOCK_ACCOUNTANT.vergiNo;
  const passOk = req.password === MOCK_ACCOUNTANT.password;

  if (!idOk || !passOk) {
    throw new AuthError(
      "invalid_credentials",
      "Kullanıcı adı veya şifre hatalı.",
    );
  }

  const user: AuthUser = {
    ...MOCK_USER,
    maliMusavirKodu: req.maliMusavirKodu || MOCK_ACCOUNTANT.maliMusavirKodu,
    firmaKodu: req.firmaKodu || MOCK_ACCOUNTANT.firmaKodu,
  };

  return { user, ...issueStubTokens(user) };
}

async function gatewayLogin(req: LoginRequest): Promise<LoginResponse> {
  const identifier = resolveIdentifier(req);
  const body: Record<string, string> = {
    identifier,
    password: req.password,
  };
  const code = req.firmaKodu?.trim() || req.maliMusavirKodu?.trim();
  if (code) body.firmaKodu = code;

  const res = await fetch(`${gatewayBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : res.status === 401
          ? "Kullanıcı adı veya şifre hatalı."
          : "Giriş başarısız.";
    throw new AuthError(
      typeof data.error === "string" ? data.error : "login_failed",
      message,
    );
  }

  const rawUser = (data.user ?? {}) as Record<string, unknown>;
  const user = normalizeUser(rawUser, req);
  if (!user.id || !data.accessToken) {
    throw new AuthError("invalid_response", "Sunucu yanıtı eksik.");
  }

  return {
    user,
    accessToken: String(data.accessToken),
    refreshToken: String(data.refreshToken ?? ""),
    tokenType: "Bearer",
    expiresIn: Number(data.expiresIn ?? 3600),
  };
}

export interface LoginResult {
  response: LoginResponse;
  source: "gateway" | "mock";
}

/**
 * Varsayılan: yalnızca gateway.
 * mock / auto yalnızca VITE_AUTH_MODE ile açılır.
 */
export async function loginWithGatewayOrMock(
  req: LoginRequest,
): Promise<LoginResult> {
  const mode = authMode();

  if (mode === "mock") {
    return { response: mockLogin(req), source: "mock" };
  }

  if (mode === "gateway") {
    return { response: await gatewayLogin(req), source: "gateway" };
  }

  try {
    return { response: await gatewayLogin(req), source: "gateway" };
  } catch (gatewayErr) {
    try {
      return { response: mockLogin(req), source: "mock" };
    } catch (mockErr) {
      if (
        gatewayErr instanceof TypeError ||
        (gatewayErr instanceof AuthError && gatewayErr.code === "login_failed")
      ) {
        throw mockErr;
      }
      throw gatewayErr;
    }
  }
}

export function isAccountantRole(role: string | undefined): boolean {
  return (role ?? "").toLowerCase() === "accountant";
}
