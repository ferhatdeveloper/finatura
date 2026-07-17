import { config } from '../config.js';
import {
  digitsOnly,
  normalizeLoginIdentifier,
  normalizeTrPhoneDigits,
} from './loginIdentifier.js';
import type {
  AuthUserRecord,
  LoginTenantHint,
  UserRepository,
} from './userRepository.js';

type StubRecord = AuthUserRecord & {
  password: string;
  firmaKodu: string;
  phoneDigits?: string;
  tckn?: string;
  vergiNo?: string;
};

/**
 * Geliştirme stub kullanıcı deposu — CENTRAL_DATABASE_URL olmadan çalışır.
 * Ortam değişkenleri: AUTH_STUB_* (+ opsiyonel AUTH_STUB_ACCOUNTANT_*)
 * Identifier: e-posta | telefon | TCKN | vergi no
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
      phoneDigits: process.env.AUTH_STUB_PHONE_DIGITS ?? '5551112233',
      tckn: process.env.AUTH_STUB_TCKN ?? '10000000146',
      vergiNo: process.env.AUTH_STUB_VERGI_NO ?? '1234567890',
    };

    const accountant: StubRecord = {
      userId:
        process.env.AUTH_STUB_ACCOUNTANT_USER_ID ??
        '00000000-0000-4000-8000-000000000002',
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
      phoneDigits: process.env.AUTH_STUB_ACCOUNTANT_PHONE_DIGITS ?? '5552223344',
      tckn: process.env.AUTH_STUB_ACCOUNTANT_TCKN ?? '10000000154',
      vergiNo: process.env.AUTH_STUB_ACCOUNTANT_VERGI_NO ?? '9876543210',
    };

    const superadmin: StubRecord = {
      userId:
        process.env.AUTH_STUB_SUPERADMIN_USER_ID ??
        '00000000-0000-4000-8000-000000000003',
      email: process.env.AUTH_STUB_SUPERADMIN_EMAIL ?? 'admin@finatura.app',
      displayName: process.env.AUTH_STUB_SUPERADMIN_NAME ?? 'Finatura Superadmin',
      tenantId: config.authStub.tenantId,
      tenantSlug: config.authStub.tenantSlug,
      role: 'admin',
      password: process.env.AUTH_STUB_SUPERADMIN_PASSWORD ?? 'admin1234',
      firmaKodu: config.authStub.firmaKodu,
      isPlatformAdmin: true,
      phoneDigits: process.env.AUTH_STUB_SUPERADMIN_PHONE_DIGITS ?? '5559998877',
      tckn: process.env.AUTH_STUB_SUPERADMIN_TCKN ?? '10000000162',
      vergiNo: process.env.AUTH_STUB_SUPERADMIN_VERGI_NO ?? '1111111111',
    };

    return [owner, accountant, superadmin];
  }

  async authenticate(
    identifier: string,
    password: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null> {
    const id = normalizeLoginIdentifier(identifier);
    const user = this.listStubs().find(
      (u) => this.matchesIdentifier(u, id) && u.password === password,
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

  private matchesIdentifier(
    user: StubRecord,
    id: ReturnType<typeof normalizeLoginIdentifier>,
  ): boolean {
    if (id.email && user.email.toLowerCase() === id.email) return true;
    if (id.phoneDigits && user.phoneDigits === id.phoneDigits) return true;
    if (id.tckn && user.tckn === id.tckn) return true;
    if (id.vergiNo && user.vergiNo === id.vergiNo) return true;

    // Ham e-posta eşitliği (normalize e-posta üretmese bile)
    const rawLower = id.raw.toLowerCase();
    if (rawLower === user.email.toLowerCase()) return true;

    const rawPhone = normalizeTrPhoneDigits(digitsOnly(id.raw));
    if (rawPhone && user.phoneDigits === rawPhone) return true;

    return false;
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
