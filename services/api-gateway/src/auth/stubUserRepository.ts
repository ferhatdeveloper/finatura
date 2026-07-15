import { config } from '../config.js';
import type {
  AuthUserRecord,
  LoginTenantHint,
  UserRepository,
} from './userRepository.js';

/**
 * Geliştirme stub kullanıcı deposu — CENTRAL_DATABASE_URL olmadan çalışır.
 * Ortam değişkenleri: AUTH_STUB_*
 */
export class StubUserRepository implements UserRepository {
  private getStub(): AuthUserRecord & {
    password: string;
    firmaKodu: string;
  } {
    return {
      userId: config.authStub.userId,
      email: config.authStub.email,
      displayName: 'Finatura Demo',
      tenantId: config.authStub.tenantId,
      tenantSlug: config.authStub.tenantSlug,
      role: config.authStub.role,
      password: config.authStub.password,
      firmaKodu: config.authStub.firmaKodu,
    };
  }

  async authenticate(
    email: string,
    password: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null> {
    const user = this.getStub();
    if (
      email.trim().toLowerCase() !== user.email.toLowerCase() ||
      password !== user.password
    ) {
      return null;
    }
    if (tenantHint && !this.matchesTenantHint(user, tenantHint)) {
      return null;
    }
    return this.toRecord(user);
  }

  async findById(
    userId: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null> {
    const user = this.getStub();
    if (user.userId !== userId) return null;
    if (tenantHint && !this.matchesTenantHint(user, tenantHint)) {
      return null;
    }
    return this.toRecord(user);
  }

  async hasMembership(
    userId: string,
    tenantIdOrSlug: string,
  ): Promise<boolean> {
    const user = this.getStub();
    if (user.userId !== userId) return false;
    return (
      tenantIdOrSlug === user.tenantId ||
      tenantIdOrSlug === user.tenantSlug ||
      tenantIdOrSlug.toUpperCase() === user.firmaKodu.toUpperCase()
    );
  }

  private matchesTenantHint(
    user: AuthUserRecord & { firmaKodu: string },
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
        firmaKodu.trim() === user.tenantId
      );
    }
    return true;
  }

  private toRecord(
    user: AuthUserRecord & { password?: string; firmaKodu?: string },
  ): AuthUserRecord {
    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      role: user.role,
    };
  }
}
