import { config } from '../config.js';
import type { AuthUserRecord, UserRepository } from './userRepository.js';

/**
 * Geliştirme stub kullanıcı deposu — CENTRAL_DATABASE_URL olmadan çalışır.
 * Ortam değişkenleri: AUTH_STUB_*
 */
export class StubUserRepository implements UserRepository {
  private getStub(): AuthUserRecord & { password: string } {
    return {
      userId: config.authStub.userId,
      email: config.authStub.email,
      displayName: 'Finatura Demo',
      tenantId: config.authStub.tenantId,
      tenantSlug: config.authStub.tenantSlug,
      role: 'owner',
      password: config.authStub.password,
    };
  }

  async authenticate(
    email: string,
    password: string,
  ): Promise<AuthUserRecord | null> {
    const user = this.getStub();
    if (
      email.trim().toLowerCase() === user.email.toLowerCase() &&
      password === user.password
    ) {
      const { password: _pw, ...record } = user;
      return record;
    }
    return null;
  }

  async findById(userId: string): Promise<AuthUserRecord | null> {
    const user = this.getStub();
    if (user.userId !== userId) return null;
    const { password: _pw, ...record } = user;
    return record;
  }

  async hasMembership(
    userId: string,
    tenantIdOrSlug: string,
  ): Promise<boolean> {
    const user = this.getStub();
    if (user.userId !== userId) return false;
    return (
      tenantIdOrSlug === user.tenantId || tenantIdOrSlug === user.tenantSlug
    );
  }
}
