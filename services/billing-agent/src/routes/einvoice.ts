import { Router } from 'express';
import {
  EinvoiceConfigValidationError,
  getPrimaryEinvoiceProvider,
  listTenantEinvoiceProviders,
  setPrimaryEinvoiceProvider,
  upsertTenantEinvoiceProvider,
} from '../einvoice/providerConfig.js';
import { requireTenantHeader } from '../middleware/tenantHeader.js';
import type { EinvoiceProviderCode } from '../types.js';

export const einvoiceRouter = Router();

einvoiceRouter.use(requireTenantHeader);

function handleError(
  res: import('express').Response,
  err: unknown,
): void {
  if (err instanceof EinvoiceConfigValidationError) {
    res.status(400).json({ error: err.code, message: err.message });
    return;
  }
  console.error('[einvoice]', err);
  res.status(500).json({ error: 'internal_error' });
}

/**
 * GET /api/einvoice/providers
 * Tenant'ın aktif entegratör yapılandırmaları (credentials yok).
 */
einvoiceRouter.get('/providers', async (req, res) => {
  try {
    const items = await listTenantEinvoiceProviders(req.tenantId!);
    res.json({ tenantId: req.tenantId, items });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /api/einvoice/providers/primary
 * Gönderimde kullanılacak birincil entegratör.
 */
einvoiceRouter.get('/providers/primary', async (req, res) => {
  try {
    const primary = await getPrimaryEinvoiceProvider(req.tenantId!);
    res.json({
      tenantId: req.tenantId,
      primary,
    });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * PUT /api/einvoice/providers
 * Body: { provider, isPrimary?, isActive?, merchantCode?, branchCode?,
 *         environment?, metadata?, credentialsPlaintext? }
 */
einvoiceRouter.put('/providers', async (req, res) => {
  try {
    const provider = String(req.body?.provider ?? '') as EinvoiceProviderCode;
    const config = await upsertTenantEinvoiceProvider({
      tenantId: req.tenantId!,
      provider,
      isPrimary:
        typeof req.body?.isPrimary === 'boolean'
          ? req.body.isPrimary
          : undefined,
      isActive:
        typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
      merchantCode:
        typeof req.body?.merchantCode === 'string' ||
        req.body?.merchantCode === null
          ? req.body.merchantCode
          : undefined,
      branchCode:
        typeof req.body?.branchCode === 'string' ||
        req.body?.branchCode === null
          ? req.body.branchCode
          : undefined,
      environment:
        req.body?.environment === 'test' ||
        req.body?.environment === 'production'
          ? req.body.environment
          : undefined,
      metadata:
        req.body?.metadata && typeof req.body.metadata === 'object'
          ? (req.body.metadata as Record<string, unknown>)
          : undefined,
      credentialsPlaintext:
        typeof req.body?.credentialsPlaintext === 'string'
          ? req.body.credentialsPlaintext
          : undefined,
    });
    res.status(200).json({ ok: true, config });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * POST /api/einvoice/providers/primary
 * Body: { provider: 'edm'|'uyumsoft'|'fit'|'elogo'|'qnb'|'nes'|'nilvera'|'izibiz' }
 */
einvoiceRouter.post('/providers/primary', async (req, res) => {
  try {
    const provider = String(req.body?.provider ?? '') as EinvoiceProviderCode;
    const config = await setPrimaryEinvoiceProvider(req.tenantId!, provider);
    res.json({ ok: true, config });
  } catch (err) {
    handleError(res, err);
  }
});
