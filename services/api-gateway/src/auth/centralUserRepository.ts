import type { Pool } from 'pg';
import { getCentralPool } from '../db/centralPool.js';
import type { AuthUserRecord, UserRepository } from './userRepository.js';

/**
 * Central DB kullanıcı + membership repository iskeleti.
 *
 * TODO (central schema — henüz 01_schema.sql'de yok):
 *   CREATE TABLE public.users (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     email         text NOT NULL UNIQUE,
 *     password_hash text NOT NULL,          -- bcrypt/argon2
 *     display_name  text NOT NULL,
 *     is_active     boolean NOT NULL DEFAULT true,
 *     created_at    timestamptz NOT NULL DEFAULT now(),
 *     updated_at    timestamptz NOT NULL DEFAULT now()
 *   );
 *
 * Mevcut: tenant_memberships(user_id, tenant_id, role, is_active, deleted_at)
 *         tenants(id, slug, status, deleted_at)
 *
 * AUTH_PROVIDER=central iken CENTRAL_DATABASE_URL zorunlu.
 * Parola: seed için `dev:<plaintext>`; üretimde bcrypt.compare TODO.
 */
export class CentralUserRepository implements UserRepository {
  constructor(private readonly pool: Pool = getCentralPool()) {}

  async authenticate(
    email: string,
    password: string,
  ): Promise<AuthUserRecord | null> {
    const row = await this.fetchUserWithPrimaryMembership(
      email.trim().toLowerCase(),
    );
    if (!row) return null;

    if (!verifyPasswordDev(password, row.password_hash)) {
      return null;
    }

    return this.toRecord(row);
  }

  async findById(userId: string): Promise<AuthUserRecord | null> {
    try {
      const { rows } = await this.pool.query<UserMembershipRow>(
        `${USER_MEMBERSHIP_SQL}
         AND u.id = $1
         ORDER BY ${ROLE_ORDER}
         LIMIT 1`,
        [userId],
      );
      const row = rows[0];
      return row ? this.toRecord(row) : null;
    } catch (err) {
      rethrowMissingUsersTable(err);
    }
  }

  async hasMembership(
    userId: string,
    tenantIdOrSlug: string,
  ): Promise<boolean> {
    const { rows } = await this.pool.query<{ ok: number }>(
      `SELECT 1 AS ok
       FROM public.tenant_memberships m
       INNER JOIN public.tenants t
         ON t.id = m.tenant_id AND t.deleted_at IS NULL
       WHERE m.user_id = $1
         AND m.is_active = true
         AND m.deleted_at IS NULL
         AND (t.id::text = $2 OR t.slug = $2)
       LIMIT 1`,
      [userId, tenantIdOrSlug],
    );
    return rows.length > 0;
  }

  private async fetchUserWithPrimaryMembership(
    emailLower: string,
  ): Promise<UserMembershipRow | null> {
    try {
      const { rows } = await this.pool.query<UserMembershipRow>(
        `${USER_MEMBERSHIP_SQL}
         AND lower(u.email) = $1
         ORDER BY ${ROLE_ORDER}
         LIMIT 1`,
        [emailLower],
      );
      return rows[0] ?? null;
    } catch (err) {
      rethrowMissingUsersTable(err);
    }
  }

  private toRecord(row: UserMembershipRow): AuthUserRecord {
    return {
      userId: String(row.user_id),
      email: row.email,
      displayName: row.display_name,
      tenantId: String(row.tenant_id),
      tenantSlug: row.tenant_slug,
      role: row.role,
    };
  }
}

/** Geliştirme parola kontrolü — prod'da bcrypt ile değiştirilecek */
function verifyPasswordDev(password: string, passwordHash: string): boolean {
  // TODO(prod): return await bcrypt.compare(password, passwordHash)
  if (passwordHash.startsWith('dev:')) {
    return passwordHash.slice(4) === password;
  }
  console.warn(
    '[CentralUserRepository] password_hash beklenen biçim: dev:<plaintext> (bcrypt TODO).',
  );
  return false;
}

function rethrowMissingUsersTable(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('does not exist') || msg.includes('relation')) {
    throw new Error(
      '[CentralUserRepository] public.users tablosu bulunamadı. ' +
        'Central şemaya users ekleyin veya AUTH_PROVIDER=stub kullanın. ' +
        `Detay: ${msg}`,
    );
  }
  throw err;
}

interface UserMembershipRow {
  user_id: string;
  email: string;
  password_hash: string;
  display_name: string;
  tenant_id: string;
  tenant_slug: string;
  role: string;
}

const ROLE_ORDER = `CASE m.role
  WHEN 'owner' THEN 0
  WHEN 'admin' THEN 1
  WHEN 'member' THEN 2
  ELSE 3
END`;

/**
 * Owner > admin > member öncelikli birincil üyelik.
 * users tablosu yoksa sorgu hata verir → açık TODO mesajı.
 */
const USER_MEMBERSHIP_SQL = `
SELECT
  u.id            AS user_id,
  u.email,
  u.password_hash,
  u.display_name,
  t.id            AS tenant_id,
  t.slug          AS tenant_slug,
  m.role
FROM public.users u
INNER JOIN public.tenant_memberships m
  ON m.user_id = u.id
 AND m.is_active = true
 AND m.deleted_at IS NULL
INNER JOIN public.tenants t
  ON t.id = m.tenant_id
 AND t.deleted_at IS NULL
WHERE u.is_active = true
`;
