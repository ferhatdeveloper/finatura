import type { Pool } from 'pg';
import { getCentralPool } from '../db/centralPool.js';
import {
  hasLookupKey,
  normalizeLoginIdentifier,
  type NormalizedLoginIdentifier,
} from './loginIdentifier.js';
import type {
  AuthUserRecord,
  LoginTenantHint,
  UserRepository,
} from './userRepository.js';

/**
 * Central DB: users + memberships + firma kodu (mali_musavir_kodu / accountant_codes).
 *
 * Şema: database/central/05_auth_accountant.sql + 09_user_login_identifiers.sql
 * Rol enum/davet: 05b_membership_accountant.sql (ayrı)
 * AUTH_PROVIDER=central → CENTRAL_DATABASE_URL zorunlu.
 * Parola: seed `dev:<plaintext>`; üretimde bcrypt.compare TODO.
 */
export class CentralUserRepository implements UserRepository {
  constructor(private readonly pool: Pool = getCentralPool()) {}

  async authenticate(
    identifier: string,
    password: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null> {
    const normalized = normalizeLoginIdentifier(identifier);
    if (!hasLookupKey(normalized)) return null;

    const row = await this.fetchUserWithMembership(
      { mode: 'identifier', identifier: normalized },
      tenantHint,
    );
    if (!row) return null;

    if (!verifyPasswordDev(password, row.password_hash)) {
      return null;
    }

    void this.touchLastLogin(row.user_id);
    return this.toRecord(row);
  }

  async findById(
    userId: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null> {
    try {
      const row = await this.fetchUserWithMembership(
        { mode: 'userId', userId },
        tenantHint,
      );
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
         AND (
           t.id::text = $2
           OR t.slug = $2
           OR upper(coalesce(t.mali_musavir_kodu, '')) = upper($2)
         )
       LIMIT 1`,
      [userId, tenantIdOrSlug],
    );
    return rows.length > 0;
  }

  private async touchLastLogin(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE public.users
         SET last_login_at = now(), updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL`,
        [userId],
      );
    } catch {
      // best-effort
    }
  }

  private async fetchUserWithMembership(
    lookup:
      | { mode: 'identifier'; identifier: NormalizedLoginIdentifier }
      | { mode: 'userId'; userId: string },
    tenantHint?: LoginTenantHint,
  ): Promise<UserMembershipRow | null> {
    try {
      const hasHint = Boolean(
        tenantHint?.tenantId ||
          tenantHint?.tenantSlug ||
          tenantHint?.firmaKodu,
      );

      const params: unknown[] = [];
      const where: string[] = ['u.is_active = true', 'u.deleted_at IS NULL'];

      if (lookup.mode === 'identifier') {
        const id = lookup.identifier;
        const clauses: string[] = [];
        if (id.email) {
          params.push(id.email);
          clauses.push(`lower(u.email) = $${params.length}`);
        }
        if (id.phoneDigits) {
          params.push(id.phoneDigits);
          clauses.push(`u.phone_digits = $${params.length}`);
        }
        if (id.tckn) {
          params.push(id.tckn);
          clauses.push(`u.tckn = $${params.length}`);
        }
        if (id.vergiNo) {
          params.push(id.vergiNo);
          clauses.push(`u.vergi_no = $${params.length}`);
        }
        if (clauses.length === 0) return null;
        where.push(`(${clauses.join(' OR ')})`);
      } else {
        params.push(lookup.userId);
        where.push(`u.id = $${params.length}`);
      }

      if (hasHint && tenantHint) {
        const clauses: string[] = [];
        if (tenantHint.tenantId) {
          params.push(tenantHint.tenantId);
          clauses.push(`t.id::text = $${params.length}`);
        }
        if (tenantHint.tenantSlug) {
          params.push(tenantHint.tenantSlug);
          clauses.push(`t.slug = $${params.length}`);
        }
        if (tenantHint.firmaKodu) {
          params.push(tenantHint.firmaKodu.trim());
          const p = `$${params.length}`;
          clauses.push(`(
            t.id::text = ${p}
            OR t.slug = ${p}
            OR upper(coalesce(t.mali_musavir_kodu, '')) = upper(${p})
            OR EXISTS (
              SELECT 1 FROM public.accountant_codes ac
              WHERE ac.tenant_id = t.id
                AND ac.is_active = true
                AND ac.revoked_at IS NULL
                AND (ac.expires_at IS NULL OR ac.expires_at > now())
                AND upper(ac.code) = upper(${p})
            )
          )`);
        }
        if (clauses.length > 0) {
          where.push(`(${clauses.join(' OR ')})`);
        }
      }

      const { rows } = await this.pool.query<UserMembershipRow>(
        `${USER_MEMBERSHIP_SQL}
         WHERE ${where.join(' AND ')}
         ORDER BY ${ROLE_ORDER}
         LIMIT 1`,
        params,
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
      displayName: row.full_name,
      tenantId: String(row.tenant_id),
      tenantSlug: row.tenant_slug,
      role: row.role,
      isPlatformAdmin: Boolean(row.is_platform_admin),
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
      '[CentralUserRepository] public.users (veya ilgili) tablo eksik. ' +
        'database/central/05_auth_accountant.sql + 09_user_login_identifiers.sql uygulayın ' +
        'veya AUTH_PROVIDER=stub kullanın. ' +
        `Detay: ${msg}`,
    );
  }
  throw err;
}

interface UserMembershipRow {
  user_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  tenant_id: string;
  tenant_slug: string;
  role: string;
  is_platform_admin?: boolean;
}

const ROLE_ORDER = `CASE m.role::text
  WHEN 'owner' THEN 0
  WHEN 'admin' THEN 1
  WHEN 'member' THEN 2
  WHEN 'accountant' THEN 3
  WHEN 'viewer' THEN 4
  ELSE 5
END`;

/**
 * users ⋈ memberships ⋈ tenants (05 + 09).
 * Role sıralama: owner > admin > member > accountant > viewer.
 */
const USER_MEMBERSHIP_SQL = `
SELECT
  u.id            AS user_id,
  u.email,
  u.password_hash,
  u.full_name,
  coalesce(u.is_platform_admin, false) AS is_platform_admin,
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
`;
