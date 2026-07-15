import { randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import type {
  AccountantLinkStatus,
  MembershipRole,
} from '../auth/membershipRoles.js';
import { config } from '../config.js';
import { getCentralPool } from '../db/centralPool.js';
import { requireAuth } from '../middleware/auth.js';

function cryptoRandomUuid(): string {
  return randomUUID();
}

export const membershipsRouter = Router();

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_TTL_HOURS = 72;

interface AccountantInviteRow {
  id: string;
  tenant_id: string;
  accountant_user_id: string | null;
  invited_by_user_id: string;
  kod: string;
  status: AccountantLinkStatus;
  expires_at: Date | string | null;
  created_at: Date | string;
}

interface TenantMembershipRow {
  tenant_id: string;
  slug: string;
  display_name: string;
  tenant_status: string;
  role: MembershipRole;
  membership_id: string;
  joined_at: Date | string | null;
}

/** Bellek içi stub — CENTRAL_DATABASE_URL yokken iskelet demoları */
const stubInvites = new Map<string, AccountantInviteRow>();
const stubMemberships = new Map<string, TenantMembershipRow[]>();

function useCentralDb(): boolean {
  return Boolean(config.centralDatabaseUrl);
}

function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += INVITE_CODE_CHARS[bytes[i]! % INVITE_CODE_CHARS.length];
  }
  return out;
}

function ensureStubSeed(userId: string): void {
  if (stubMemberships.has(userId)) return;
  stubMemberships.set(userId, [
    {
      tenant_id: config.authStub.tenantId,
      slug: config.authStub.tenantSlug,
      display_name: 'Örnek Galeri',
      tenant_status: 'active',
      role: 'owner',
      membership_id: '00000000-0000-4000-8000-0000000000m1',
      joined_at: new Date().toISOString(),
    },
  ]);
}

/**
 * POST /v1/tenants/:id/accountant/invite
 * Tenant owner/admin mali müşavir davet kodu üretir.
 */
membershipsRouter.post(
  '/v1/tenants/:id/accountant/invite',
  requireAuth,
  async (req, res, next) => {
    try {
      const tenantId = req.params.id?.trim();
      if (!tenantId) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'tenant id zorunludur',
        });
        return;
      }

      const userId = req.auth!.userId;
      const kod = generateInviteCode();
      const expiresAt = new Date(
        Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000,
      );

      if (!useCentralDb()) {
        ensureStubSeed(userId);
        const memberships = stubMemberships.get(userId) ?? [];
        const mine = memberships.find((m) => m.tenant_id === tenantId);
        if (!mine || !['owner', 'admin'].includes(mine.role)) {
          res.status(403).json({
            error: 'forbidden',
            message: 'Davet için owner veya admin üyelik gerekli',
          });
          return;
        }

        const row: AccountantInviteRow = {
          id: cryptoRandomUuid(),
          tenant_id: tenantId,
          accountant_user_id: null,
          invited_by_user_id: userId,
          kod,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        };
        stubInvites.set(kod, row);

        res.status(201).json({
          invite: {
            id: row.id,
            tenantId: row.tenant_id,
            kod: row.kod,
            status: row.status,
            expiresAt: row.expires_at,
          },
          mode: 'stub',
        });
        return;
      }

      const pool = getCentralPool();

      const { rows: roleRows } = await pool.query<{ role: string }>(
        `SELECT m.role::text AS role
         FROM public.tenant_memberships m
         WHERE m.tenant_id = $1::uuid
           AND m.user_id = $2::uuid
           AND m.is_active = true
           AND m.deleted_at IS NULL
         LIMIT 1`,
        [tenantId, userId],
      );

      const role = roleRows[0]?.role;
      if (!role || !['owner', 'admin'].includes(role)) {
        res.status(403).json({
          error: 'forbidden',
          message: 'Davet için owner veya admin üyelik gerekli',
        });
        return;
      }

      const { rows } = await pool.query<AccountantInviteRow>(
        `INSERT INTO public.mali_musavir_baglantilari
           (tenant_id, invited_by_user_id, kod, status, expires_at)
         VALUES ($1::uuid, $2::uuid, $3, 'pending', $4)
         RETURNING id, tenant_id, accountant_user_id, invited_by_user_id,
                   kod, status, expires_at, created_at`,
        [tenantId, userId, kod, expiresAt.toISOString()],
      );

      const invite = rows[0]!;
      res.status(201).json({
        invite: {
          id: invite.id,
          tenantId: invite.tenant_id,
          kod: invite.kod,
          status: invite.status,
          expiresAt: invite.expires_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /v1/accountant/link
 * Body: { kod } — mali müşavir davet kodu ile tenant'a bağlanır.
 */
membershipsRouter.post('/v1/accountant/link', requireAuth, async (req, res, next) => {
  try {
    const kod =
      typeof req.body?.kod === 'string'
        ? req.body.kod.trim().toUpperCase()
        : '';

    if (!kod) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'kod zorunludur',
      });
      return;
    }

    const userId = req.auth!.userId;

    if (!useCentralDb()) {
      const invite = stubInvites.get(kod);
      if (!invite || invite.status !== 'pending') {
        res.status(404).json({
          error: 'invite_not_found',
          message: 'Geçerli pending davet kodu bulunamadı',
        });
        return;
      }

      const expiresAt = invite.expires_at
        ? new Date(invite.expires_at).getTime()
        : null;
      if (expiresAt !== null && expiresAt < Date.now()) {
        invite.status = 'revoked';
        res.status(410).json({
          error: 'invite_expired',
          message: 'Davet kodunun süresi dolmuş',
        });
        return;
      }

      invite.status = 'approved';
      invite.accountant_user_id = userId;
      stubInvites.set(kod, invite);

      ensureStubSeed(userId);
      const list = stubMemberships.get(userId) ?? [];
      if (!list.some((m) => m.tenant_id === invite.tenant_id)) {
        list.push({
          tenant_id: invite.tenant_id,
          slug: `tenant-${invite.tenant_id.slice(0, 8)}`,
          display_name: 'Bağlı Tenant',
          tenant_status: 'active',
          role: 'accountant',
          membership_id: cryptoRandomUuid(),
          joined_at: new Date().toISOString(),
        });
        stubMemberships.set(userId, list);
      }

      res.json({
        link: {
          tenantId: invite.tenant_id,
          status: 'approved',
          role: 'accountant' satisfies MembershipRole,
          kod,
        },
        mode: 'stub',
      });
      return;
    }

    const pool = getCentralPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows: inviteRows } = await client.query<AccountantInviteRow>(
        `SELECT id, tenant_id, accountant_user_id, invited_by_user_id,
                kod, status, expires_at, created_at
         FROM public.mali_musavir_baglantilari
         WHERE kod = $1 AND status = 'pending'
         FOR UPDATE`,
        [kod],
      );

      const invite = inviteRows[0];
      if (!invite) {
        await client.query('ROLLBACK');
        res.status(404).json({
          error: 'invite_not_found',
          message: 'Geçerli pending davet kodu bulunamadı',
        });
        return;
      }

      if (
        invite.expires_at &&
        new Date(invite.expires_at).getTime() < Date.now()
      ) {
        await client.query(
          `UPDATE public.mali_musavir_baglantilari
           SET status = 'revoked', revoked_at = now()
           WHERE id = $1`,
          [invite.id],
        );
        await client.query('COMMIT');
        res.status(410).json({
          error: 'invite_expired',
          message: 'Davet kodunun süresi dolmuş',
        });
        return;
      }

      await client.query(
        `UPDATE public.mali_musavir_baglantilari
         SET accountant_user_id = $1::uuid,
             status = 'approved',
             approved_at = now()
         WHERE id = $2`,
        [userId, invite.id],
      );

      const { rowCount } = await client.query(
        `UPDATE public.tenant_memberships
         SET role = 'accountant',
             is_active = true,
             deleted_at = NULL,
             joined_at = COALESCE(joined_at, now()),
             updated_at = now()
         WHERE tenant_id = $1::uuid
           AND user_id = $2::uuid`,
        [invite.tenant_id, userId],
      );

      if (!rowCount) {
        await client.query(
          `INSERT INTO public.tenant_memberships
             (tenant_id, user_id, role, is_active, invited_at, joined_at)
           VALUES ($1::uuid, $2::uuid, 'accountant', true, now(), now())`,
          [invite.tenant_id, userId],
        );
      }

      await client.query('COMMIT');

      res.json({
        link: {
          tenantId: invite.tenant_id,
          status: 'approved',
          role: 'accountant' satisfies MembershipRole,
          kod,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /v1/me/tenants
 * Oturum açmış kullanıcının aktif tenant üyelikleri.
 */
membershipsRouter.get('/v1/me/tenants', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;

    if (!useCentralDb()) {
      ensureStubSeed(userId);
      const tenants = (stubMemberships.get(userId) ?? []).map((m) => ({
        tenantId: m.tenant_id,
        slug: m.slug,
        displayName: m.display_name,
        status: m.tenant_status,
        role: m.role,
        membershipId: m.membership_id,
        joinedAt: m.joined_at,
      }));
      res.json({ tenants, mode: 'stub' });
      return;
    }

    const pool = getCentralPool();
    const { rows } = await pool.query<TenantMembershipRow>(
      `SELECT
         t.id            AS tenant_id,
         t.slug,
         t.display_name,
         t.status::text  AS tenant_status,
         m.role::text    AS role,
         m.id            AS membership_id,
         m.joined_at
       FROM public.tenant_memberships m
       INNER JOIN public.tenants t
         ON t.id = m.tenant_id AND t.deleted_at IS NULL
       WHERE m.user_id = $1::uuid
         AND m.is_active = true
         AND m.deleted_at IS NULL
       ORDER BY
         CASE m.role::text
           WHEN 'owner' THEN 0
           WHEN 'admin' THEN 1
           WHEN 'member' THEN 2
           WHEN 'accountant' THEN 3
           ELSE 4
         END,
         t.display_name`,
      [userId],
    );

    res.json({
      tenants: rows.map((m) => ({
        tenantId: m.tenant_id,
        slug: m.slug,
        displayName: m.display_name,
        status: m.tenant_status,
        role: m.role,
        membershipId: m.membership_id,
        joinedAt: m.joined_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});
