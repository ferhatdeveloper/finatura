import { config } from '../config.js';
import type { AuthUserRecord, LoginTenantHint } from './userRepository.js';
import { getUserRepository } from './createUserRepository.js';

/**
 * @deprecated Yeni kod UserRepository kullanmalı.
 * Geriye uyumluluk: stub path senkron yardımcıları.
 */
export interface StubUser {
  userId: string;
  email: string;
  password: string;
  tenantId: string;
  tenantSlug: string;
  displayName: string;
  role: string;
  firmaKodu: string;
}

export function getStubUser(): StubUser {
  return {
    userId: config.authStub.userId,
    email: config.authStub.email,
    password: config.authStub.password,
    tenantId: config.authStub.tenantId,
    tenantSlug: config.authStub.tenantSlug,
    displayName: 'Finatura Demo',
    role: config.authStub.role,
    firmaKodu: config.authStub.firmaKodu,
  };
}

/** Senkron stub — yalnızca AUTH_PROVIDER=stub için */
export function authenticateStub(
  email: string,
  password: string,
): StubUser | null {
  if (config.authProvider !== 'stub') {
    throw new Error(
      'authenticateStub yalnızca AUTH_PROVIDER=stub ile kullanılabilir; getUserRepository() kullanın',
    );
  }
  const user = getStubUser();
  if (
    email.trim().toLowerCase() === user.email.toLowerCase() &&
    password === user.password
  ) {
    return user;
  }
  return null;
}

export function findStubById(userId: string): StubUser | null {
  const user = getStubUser();
  return user.userId === userId ? user : null;
}

export async function authenticateUser(
  identifier: string,
  password: string,
  tenantHint?: LoginTenantHint,
): Promise<AuthUserRecord | null> {
  return getUserRepository().authenticate(identifier, password, tenantHint);
}

export async function findUserById(
  userId: string,
  tenantHint?: LoginTenantHint,
): Promise<AuthUserRecord | null> {
  return getUserRepository().findById(userId, tenantHint);
}
