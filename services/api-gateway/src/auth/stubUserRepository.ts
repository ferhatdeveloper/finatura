import { config } from '../config.js';
import type {
  AuthUserRecord,
  LoginTenantHint,
  UserRepository,
} from './userRepository.js';

type StubRecord = AuthUserRecord & {
  password: string;
  firmaKodu: string;
};

/**
 * Geliştirme stub kullanıcı deposu — CENTRAL_DATABASE_URL olmadan çalışır.
 * Ortam değişkenleri: AUTH_STUB_* (+ opsiyonel AUTH_STUB_ACCOUNTANT_*)
 */
export class StubUserRepository implements UserRepository {
  private listStubs(): StubRecord[] {
    const platformAdmin =
      process.env.AUTH_STUB_PLATFORM_ADMIN === 'true' ||
      process.env.AUTH_STUB_PLATFORM_ADMIN === '1';

    const owner: StubRecord = {
      userId: config.authStub.userId,
      email: config.authStub.email,
      displayName: 'Finatura Demo',
      tenantId: config.authStub.tenantId,
      tenantSlug: config.authStub.tenantSlug,
      role: config.authStub.role,
      password: config.authStub.password,
      firmaKodu: config.authStub.firmaKodu,
      isPlatformAdmin: platformAdmin,
    };

    const accountant: StubRecord = {
      userId:
        process.env.AUTH_STUB_ACCOUNTANT_USER_ID ??
        '00000000-0000-4000-8000-0000000000mm',
      email: process.env.AUTH_STUB_ACCOUNTANT_EMAIL ?? 'mm@finatura.app',
      displayName:
        process.env.AUTH_STUB_ACCOUNTANT_DISPLAY_NAME ?? 'Ayşe Yılmaz, SMMM',
      tenantId: config.authStub.tenantId,
      tenantSlug: config.authStub.tenantSlug,
      role: 'accountant',
      password: process.env.AUTH_STUB_ACCOUNTANT_PASSWORD ?? 'mali1234',
      firmaKodu:
        process.env.AUTH_STUB_ACCOUNTANT_FIRMA_KODU ??
        process.env.AUTH_STUB_ACCOUNTANT_CODE ??
        'MM-DEMO',
      isPlatformAdmin: false,
    };

    const superadmin: StubRecord = {
      userId:
        process.env.AUTH_STUB_SUPERADMIN_USER_ID ??
        '00000000-0000-4000-8000-0000000000sa',
      email: process.env.AUTH_STUB_SUPERADMIN_EMAIL ?? 'admin@finatura.app',
      displayName: process.env.AUTH_STUB_SUPERADMIN_NAME ?? 'Finatura Superadmin',
      tenantId: config.authStub.tenantId,
      tenantSlug: config.authStub.tenantSlug,
      role: 'admin',
      password: process.env.AUTH_STUB_SUPERADMIN_PASSWORD ?? 'admin1234',
      firmaKodu: config.authStub.firmaKodu,
      isPlatformAdmin: true,
    };

    return [owner, accountant, superadmin];
  }

  async authenticate(
    email: string,
    password: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null> {
    const emailNorm = email.trim().toLowerCase();
    const user = this.listStubs().find(
      (u) => u.email.toLowerCase() === emailNorm && u.password === password,
    );
    if (!user) return null;
    if (tenantHint && !this.matchesTenantHint(user, tenantHint)) {
      return null;
    }
    return this.toRecord(user);
  }

  async findById(
    userId: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null> {
    const user = this.listStubs().find((u) => u.userId === userId);
    if (!user) return null;
    if (tenantHint && !this.matchesTenantHint(user, tenantHint)) {
      return null;
    }
    return this.toRecord(user);
  }

  async hasMembership(
    userId: string,
    tenantIdOrSlug: string,
  ): Promise<boolean> {
    const user = this.listStubs().find((u) => u.userId === userId);
    if (!user) return false;
    return (
      tenantIdOrSlug === user.tenantId ||
      tenantIdOrSlug === user.tenantSlug ||
      tenantIdOrSlug.toUpperCase() === user.firmaKodu.toUpperCase()
    );
  }

  private matchesTenantHint(
    user: StubRecord,
    hint: LoginTenantHint,
  ): boolean {
    const { firmaKodu, tenantSlug, tenantId } = hint;
    if (tenantId) return tenantId === user.tenantId;
    if (tenantSlug) return tenantSlug === user.tenantSlug;
    if (firmaKodu) {
      const code = firmaKodu.trim().toUpperCase();
      return (
        code === user.firmaKodu.toUpperCase() ||
        code === user.tenantSlug.toUpperCase() ||
        code === config.authStub.firmaKodu.toUpperCase() ||
        firmaKodu.trim() === user.tenantId
      );
    }
    return true;
  }

  private toRecord(user: StubRecord): AuthUserRecord {
    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      role: user.role,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
    };
  }
}
