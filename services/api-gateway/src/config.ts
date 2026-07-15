import 'dotenv/config';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`${name} geçerli bir sayı olmalı, gelen: ${raw}`);
  }
  return n;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export type AuthProvider = 'stub' | 'central';

const authProviderRaw = (process.env.AUTH_PROVIDER ?? 'stub').toLowerCase();
const authProvider: AuthProvider =
  authProviderRaw === 'central' ? 'central' : 'stub';

export const config = {
  port: intEnv('PORT', 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'finatura-dev-jwt-secret-change-me',
    issuer: process.env.JWT_ISSUER ?? 'finatura.api-gateway',
    audience: process.env.JWT_AUDIENCE ?? 'finatura.app',
    accessTtlSeconds: intEnv('JWT_ACCESS_TTL_SECONDS', 3600),
    refreshTtlSeconds: intEnv('JWT_REFRESH_TTL_SECONDS', 604_800),
  },
  authProvider,
  /** Central auth için — AUTH_PROVIDER=central iken zorunlu */
  centralDatabaseUrl: process.env.CENTRAL_DATABASE_URL ?? '',
  authStub: {
    email: process.env.AUTH_STUB_EMAIL ?? 'demo@finatura.app',
    password: process.env.AUTH_STUB_PASSWORD ?? 'demo1234',
    userId: process.env.AUTH_STUB_USER_ID ?? '00000000-0000-4000-8000-000000000001',
    tenantId:
      process.env.AUTH_STUB_TENANT_ID ?? '00000000-0000-4000-8000-0000000000aa',
    tenantSlug: process.env.AUTH_STUB_TENANT_SLUG ?? 'ornek-galeri',
  },
  tenantHeader: (process.env.TENANT_HEADER ?? 'x-tenant-id').toLowerCase(),
  requireTenantHeader: boolEnv('REQUIRE_TENANT_HEADER', false),
  rateLimit: {
    enabled: boolEnv('RATE_LIMIT_ENABLED', true),
    windowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60_000),
    maxRequests: intEnv('RATE_LIMIT_MAX_REQUESTS', 120),
  },
  tenantRouterUrl: process.env.TENANT_ROUTER_URL ?? 'http://localhost:3100',
  tenantRouterTimeoutMs: intEnv('TENANT_ROUTER_TIMEOUT_MS', 10_000),
} as const;

export function assertConfig(): void {
  if (!config.jwt.secret || config.jwt.secret.length < 16) {
    throw new Error('JWT_SECRET en az 16 karakter olmalı');
  }
  if (config.authProvider === 'central' && !config.centralDatabaseUrl) {
    throw new Error(
      'AUTH_PROVIDER=central iken CENTRAL_DATABASE_URL zorunludur',
    );
  }
}
