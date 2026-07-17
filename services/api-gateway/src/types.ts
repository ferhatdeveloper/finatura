/** JWT access token payload */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  /** owner | admin | member | viewer | accountant */
  role: string;
  /** SaaS platform superadmin */
  isPlatformAdmin?: boolean;
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
  role: string;
  isPlatformAdmin?: boolean;
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
