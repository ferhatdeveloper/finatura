/** Gateway / mock login sözleşmesi */
export type UserRole = "accountant" | "owner" | "admin" | "member" | "viewer" | string;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  /** Mükellef / firma ünvanı (header) */
  firmaUnvan: string;
  tenantId: string;
  tenantSlug: string;
  role: UserRole;
  /** Girişte kullanılan kodlar (gösterim) */
  maliMusavirKodu?: string;
  firmaKodu?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface LoginRequest {
  /** E-posta | telefon | TCKN | vergi no — tek kullanıcı adı alanı */
  identifier: string;
  password: string;
  /** @deprecated Geriye uyum — identifier kullanın */
  email?: string;
  /** Mali müşavir davet kodu (opsiyonel) */
  maliMusavirKodu?: string;
  /** Firma / tenant davet kodu — gateway sözleşmesi: firmaKodu */
  firmaKodu?: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  /** Oturum kaynağı */
  source: "gateway" | "mock";
}

export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
