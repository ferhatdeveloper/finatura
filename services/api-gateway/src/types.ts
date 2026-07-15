/** JWT access token payload (auth stub) */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  typ: 'access';
}

/** JWT refresh token payload */
export interface RefreshTokenClaims {
  sub: string;
  typ: 'refresh';
}

/** İstek üzerindeki kimlik bağlamı */
export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
}

/** Tenant context — gateway seviyesinde; DB pool tenant-router'da kalır */
export interface TenantContext {
  tenantId: string;
  tenantSlug?: string;
  source: 'jwt' | 'header' | 'jwt+header';
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      tenant?: TenantContext;
      /** Rate-limit placeholder meta */
      rateLimitRemaining?: number;
    }
  }
}

export {};
