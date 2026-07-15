import { Router } from 'express';
import { config } from '../config.js';
import { deductForEfaturaSend, deductForOcr } from '../kontor/deduct.js';
import { kontorLedger } from '../kontor/ledger.js';
import { requireTenantHeader } from '../middleware/tenantHeader.js';
import {
  InsufficientKontorError,
  KontorValidationError,
  type OcrDocumentKind,
} from '../types.js';

export const kontorRouter = Router();

kontorRouter.use(requireTenantHeader);

function mapEntry(entry: {
  id: string;
  tenantId: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: Date;
}) {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    entryType: entry.entryType,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    description: entry.description,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt.toISOString(),
  };
}

function handleKontorError(res: import('express').Response, err: unknown): void {
  if (err instanceof InsufficientKontorError) {
    res.status(402).json({
      error: err.code,
      message: err.message,
      available: err.available,
      required: err.required,
    });
    return;
  }
  if (err instanceof KontorValidationError) {
    res.status(400).json({
      error: err.code,
      message: err.message,
    });
    return;
  }
  console.error('[kontor]', err);
  res.status(500).json({ error: 'internal_error' });
}

/** GET /api/kontor/balance — anlık bakiye */
kontorRouter.get('/balance', async (req, res) => {
  try {
    const balance = await kontorLedger.getBalance(req.tenantId!);
    res.json({
      tenantId: balance.tenantId,
      balance: balance.balance,
      reserved: balance.reserved,
      available: balance.available,
      updatedAt: balance.updatedAt?.toISOString() ?? null,
      costs: {
        ocrSozlesme: config.costs.ocrSozlesme,
        ocrKimlik: config.costs.ocrKimlik,
        ocrTapu: config.costs.ocrTapu,
        efaturaSend: config.costs.efaturaSend,
      },
    });
  } catch (err) {
    handleKontorError(res, err);
  }
});

/** GET /api/kontor/ledger — hareket listesi */
kontorRouter.get('/ledger', async (req, res) => {
  try {
    const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);
    const entries = await kontorLedger.listLedger(req.tenantId!, {
      limit: Number.isNaN(limit) ? 50 : limit,
      offset: Number.isNaN(offset) ? 0 : offset,
    });
    res.json({
      tenantId: req.tenantId,
      items: entries.map(mapEntry),
    });
  } catch (err) {
    handleKontorError(res, err);
  }
});

/**
 * POST /api/kontor/debit/ocr
 * Body: { documentKind: 'sozlesme'|'kimlik'|'tapu', jobId: string, createdBy?: string }
 */
kontorRouter.post('/debit/ocr', async (req, res) => {
  try {
    const documentKind = req.body?.documentKind as OcrDocumentKind;
    const jobId = String(req.body?.jobId ?? '');
    const createdBy =
      typeof req.body?.createdBy === 'string' ? req.body.createdBy : null;

    const result = await deductForOcr({
      tenantId: req.tenantId!,
      documentKind,
      jobId,
      createdBy,
    });

    res.status(result.idempotentReplay ? 200 : 201).json({
      ok: true,
      idempotentReplay: result.idempotentReplay,
      entry: mapEntry(result.entry),
    });
  } catch (err) {
    handleKontorError(res, err);
  }
});

/**
 * POST /api/kontor/debit/efatura
 * Body: { invoiceId: string, createdBy?: string }
 * Yalnızca başarılı e-fatura gönderimi sonrası çağrılmalı.
 */
kontorRouter.post('/debit/efatura', async (req, res) => {
  try {
    const invoiceId = String(req.body?.invoiceId ?? '');
    const createdBy =
      typeof req.body?.createdBy === 'string' ? req.body.createdBy : null;

    const result = await deductForEfaturaSend({
      tenantId: req.tenantId!,
      invoiceId,
      createdBy,
    });

    res.status(result.idempotentReplay ? 200 : 201).json({
      ok: true,
      idempotentReplay: result.idempotentReplay,
      entry: mapEntry(result.entry),
    });
  } catch (err) {
    handleKontorError(res, err);
  }
});

/**
 * POST /api/kontor/credit — manuel / iç yükleme.
 * Uygulama içi paket satın alma → POST /api/payment/checkout + webhook fulfill.
 * Body: { amount: number, referenceId?: string, description?: string }
 */
kontorRouter.post('/credit', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    if (!(amount > 0)) {
      throw new KontorValidationError('amount pozitif bir sayı olmalı');
    }
    const referenceId =
      typeof req.body?.referenceId === 'string' ? req.body.referenceId : null;
    const description =
      typeof req.body?.description === 'string' ? req.body.description : null;
    const createdBy =
      typeof req.body?.createdBy === 'string' ? req.body.createdBy : null;

    const result = await kontorLedger.credit({
      tenantId: req.tenantId!,
      amount,
      referenceType: 'topup',
      referenceId,
      description: description ?? `Kontör yükleme (+${amount})`,
      createdBy,
    });

    res.status(201).json({
      ok: true,
      entry: mapEntry(result.entry),
    });
  } catch (err) {
    handleKontorError(res, err);
  }
});
