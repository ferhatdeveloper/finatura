import { config } from '../config.js';
import { CentralUserRepository } from './centralUserRepository.js';
import { StubUserRepository } from './stubUserRepository.js';
import type { UserRepository } from './userRepository.js';

let cached: UserRepository | null = null;

/**
 * AUTH_PROVIDER=stub (varsayılan) → StubUserRepository
 * AUTH_PROVIDER=central → CentralUserRepository (CENTRAL_DATABASE_URL gerekir)
 */
export function getUserRepository(): UserRepository {
  if (cached) return cached;

  if (config.authProvider === 'central') {
    cached = new CentralUserRepository();
  } else {
    cached = new StubUserRepository();
  }

  return cached;
}

/** Testler için */
export function resetUserRepositoryCache(): void {
  cached = null;
}
