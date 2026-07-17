import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { getCentralPool } from '../db/centralPool.js';
import {
  AdminKontorError,
  adminCreditKontor,
  adminDebitKontor,
  getKontorBalance,
  listKontorLedger,
} from '../kontor/adminLedger.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePlatformAdmin } from '../middleware/platformAdmin.js';

export const adminTenantsRouter = Router();

adminTenantsRouter.use(requireAuth, requirePlatformAdmin);

function useCentral(): boolean {
  return config.authProvider === 'central' && Boolean(config.centralDatabaseUrl);
}

function stubTenants() {
  return [
    {
      id: config.authStub.tenantId,
      slug: config.authStub.tenantSlug,
      displayName: 'Örnek Galeri (stub)',
      status: 'active',
      primaryEmail: config.authStub.email,
      maliMusavirKodu: null as string | null,
      createdAt: new Date().toISOString(),
    },
  ];
}

/** GET /v1/admin/tenants?q=&status= */
adminTenantsRouter.get('/tenants', async (req, res, next) => {
  try {
    const q =
      typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const status =
      typeof req.query.status === 'string' ? req.query.status.trim() : '';

    if (!useCentral()) {
      const tenants = stubTenants();
      const items = await Promise.all(
        tenants
          .filter((t) => {
            if (status && t.status !== status) return false;
            if (!q) return true;
            return (
              t.slug.includes(q) ||
              t.displayName.toLowerCase().includes(q) ||
              t.id.includes(q)
            );
          })
          .map(async (t) => {
            const bal = await getKontorBalance(t.id);
            return { ...t, kontor: bal };
          }),
      );
      res.json({
        items,
        source: 'stub',
        warning:
          'AUTH_PROVIDER=stub — kalıcı kontör için CENTRAL_DATABASE_URL + AUTH_PROVIDER=central',
      });
      return;
    }

    const pool = getCentralPool();
    const params: unknown[] = [];
    const where = ['t.deleted_at IS NULL'];
    if (status) {
      params.push(status);
      where.push(`t.status::text = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(
        `(t.slug ILIKE ${p} OR t.display_name ILIKE ${p} OR t.primary_email ILIKE ${p} OR t.id::text ILIKE ${p})`,
      );
    }

    const { rows } = await pool.query(
      `SELECT
         t.id,
         t.slug,
         t.display_name,
         t.status::text AS status,
         t.primary_email,
         t.mali_musavir_kodu,
         t.created_at,
         t.suspended_at,
         coalesce(b.balance, 0) AS balance,
         coalesce(b.reserved, 0) AS reserved,
         b.updated_at AS balance_updated_at
       FROM public.tenants t
       LEFT JOIN public.tenant_kontor_balances b ON b.tenant_id = t.id
       WHERE ${where.join(' AND ')}
       ORDER BY t.display_name ASC
       LIMIT 200`,
      params,
    );

    res.json({
      items: rows.map((r) => {
        const balance = Number(r.balance);
        const reserved = Number(r.reserved);
        return {
          id: String(r.id),
          slug: r.slug,
          displayName: r.display_name,
          status: r.status,
          primaryEmail: r.primary_email,
          maliMusavirKodu: r.mali_musavir_kodu,
          createdAt: r.created_at,
          suspendedAt: r.suspended_at,
          kontor: {
            tenantId: String(r.id),
            balance,
            reserved,
            available: balance - reserved,
            updatedAt: r.balance_updated_at,
          },
        };
      }),
      source: 'central_db',
    });
  } catch (err) {
    next(err);
  }
});

/** GET /v1/admin/tenants/:id */
adminTenantsRouter.get('/tenants/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!useCentral()) {
      const t = stubTenants().find((x) => x.id === id || x.slug === id);
      if (!t) {
        res.status(404).json({ error: 'not_found', message: 'Tenant yok' });
        return;
      }
      const kontor = await getKontorBalance(t.id);
      res.json({
        tenant: t,
        kontor,
        users: [
          {
            id: config.authStub.userId,
            email: config.authStub.email,
            fullName: 'Finatura Demo',
            role: config.authStub.role,
            isActive: true,
            isPlatformAdmin: false,
          },
        ],
        source: 'stub',
      });
      return;
    }

    const pool = getCentralPool();
    const { rows } = await pool.query(
      `SELECT
         t.id, t.slug, t.display_name, t.status::text AS status,
         t.primary_email, t.mali_musavir_kodu, t.created_at, t.suspended_at,
         t.cancelled_at
       FROM public.tenants t
       WHERE t.deleted_at IS NULL
         AND (t.id::text = $1 OR t.slug = $1)
       LIMIT 1`,
      [id],
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'not_found', message: 'Tenant yok' });
      return;
    }
    const t = rows[0];
    const tenantId = String(t.id);
    const kontor = await getKontorBalance(tenantId);

    const users = await pool.query(
      `SELECT
         u.id, u.email, u.full_name, u.is_active,
         coalesce(u.is_platform_admin, false) AS is_platform_admin,
         m.role::text AS role, m.created_at AS membership_at
       FROM public.tenant_memberships m
       INNER JOIN public.users u ON u.id = m.user_id AND u.deleted_at IS NULL
       WHERE m.tenant_id = $1
         AND m.deleted_at IS NULL
         AND m.is_active = true
       ORDER BY m.role::text, u.email`,
      [tenantId],
    );

    res.json({
      tenant: {
        id: tenantId,
        slug: t.slug,
        displayName: t.display_name,
        status: t.status,
        primaryEmail: t.primary_email,
        maliMusavirKodu: t.mali_musavir_kodu,
        createdAt: t.created_at,
        suspendedAt: t.suspended_at,
        cancelledAt: t.cancelled_at,
      },
      kontor,
      users: users.rows.map((u) => ({
        id: String(u.id),
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        isActive: u.is_active,
        isPlatformAdmin: u.is_platform_admin,
        membershipAt: u.membership_at,
      })),
      source: 'central_db',
    });
  } catch (err) {
    next(err);
  }
});

/** GET /v1/admin/tenants/:id/kontor/ledger */
adminTenantsRouter.get('/tenants/:id/kontor/ledger', async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req.params.id);
    if (!tenantId) {
      res.status(404).json({ error: 'not_found', message: 'Tenant yok' });
      return;
    }
    const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);
    const items = await listKontorLedger(tenantId, { limit, offset });
    const balance = await getKontorBalance(tenantId);
    res.json({ tenantId, balance, items });
  } catch (err) {
    next(err);
  }
});

/** POST /v1/admin/tenants/:id/kontor/credit — kontör ata */
adminTenantsRouter.post(
  '/tenants/:id/kontor/credit',
  async (req, res, next) => {
    try {
      const tenantId = await resolveTenantId(req.params.id);
      if (!tenantId) {
        res.status(404).json({ error: 'not_found', message: 'Tenant yok' });
        return;
      }
      const amount = Number(req.body?.amount);
      const description =
        typeof req.body?.description === 'string'
          ? req.body.description.trim()
          : undefined;
      const entry = await adminCreditKontor({
        tenantId,
        amount,
        description,
        createdBy: req.auth!.userId,
        referenceId:
          typeof req.body?.referenceId === 'string'
            ? req.body.referenceId
            : randomUUID(),
      });
      const balance = await getKontorBalance(tenantId);
      res.status(201).json({ ok: true, entry, balance });
    } catch (err) {
      if (err instanceof AdminKontorError) {
        res.status(err.status).json({
          error: err.code,
          message: err.message,
          ...err.meta,
        });
        return;
      }
      next(err);
    }
  },
);

/** POST /v1/admin/tenants/:id/kontor/debit — kontör düş */
adminTenantsRouter.post(
  '/tenants/:id/kontor/debit',
  async (req, res, next) => {
    try {
      const tenantId = await resolveTenantId(req.params.id);
      if (!tenantId) {
        res.status(404).json({ error: 'not_found', message: 'Tenant yok' });
        return;
      }
      const amount = Number(req.body?.amount);
      const description =
        typeof req.body?.description === 'string'
          ? req.body.description.trim()
          : undefined;
      const entry = await adminDebitKontor({
        tenantId,
        amount,
        description,
        createdBy: req.auth!.userId,
        referenceId:
          typeof req.body?.referenceId === 'string'
            ? req.body.referenceId
            : randomUUID(),
      });
      const balance = await getKontorBalance(tenantId);
      res.status(201).json({ ok: true, entry, balance });
    } catch (err) {
      if (err instanceof AdminKontorError) {
        res.status(err.status).json({
          error: err.code,
          message: err.message,
          ...err.meta,
        });
        return;
      }
      next(err);
    }
  },
);

/**
 * PATCH /v1/admin/tenants/:id
 * Body: { status: 'active' | 'suspended' }
 */
adminTenantsRouter.patch('/tenants/:id', async (req, res, next) => {
  try {
    const status = String(req.body?.status ?? '').trim();
    if (status !== 'active' && status !== 'suspended') {
      res.status(400).json({
        error: 'validation_error',
        message: "status 'active' veya 'suspended' olmalı",
      });
      return;
    }

    if (!useCentral()) {
      res.json({
        ok: true,
        warning: 'Stub modunda tenant durumu kalıcı değil',
        status,
      });
      return;
    }

    const pool = getCentralPool();
    const tenantId = await resolveTenantId(req.params.id);
    if (!tenantId) {
      res.status(404).json({ error: 'not_found', message: 'Tenant yok' });
      return;
    }

    if (status === 'suspended') {
      await pool.query(
        `UPDATE public.tenants
         SET status = 'suspended'::public.tenant_status,
             suspended_at = coalesce(suspended_at, now()),
             updated_at = now()
         WHERE id = $1`,
        [tenantId],
      );
    } else {
      await pool.query(
        `UPDATE public.tenants
         SET status = 'active'::public.tenant_status,
             suspended_at = NULL,
             updated_at = now()
         WHERE id = $1`,
        [tenantId],
      );
    }

    res.json({ ok: true, tenantId, status });
  } catch (err) {
    next(err);
  }
});

async function resolveTenantId(idOrSlug: string): Promise<string | null> {
  if (!useCentral()) {
    const t = stubTenants().find((x) => x.id === idOrSlug || x.slug === idOrSlug);
    return t?.id ?? null;
  }
  const pool = getCentralPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM public.tenants
     WHERE deleted_at IS NULL AND (id::text = $1 OR slug = $1)
     LIMIT 1`,
    [idOrSlug],
  );
  return rows[0] ? String(rows[0].id) : null;
}
