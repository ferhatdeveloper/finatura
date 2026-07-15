import { Router, type Request, type Response } from 'express';
import type { TransformResult } from '@finatura/invoice-transformers';
import {
  createIntegrator,
  getDefaultIntegrator,
  type InvoiceDraftPayload,
  type InvoiceKind,
} from '../adapters/index.js';
import { config, type IntegratorProvider } from '../config.js';
import { invoiceDraftFromTransformer } from '../flow/fromTransformerDraft.js';
import { runSendApprovePdfFlow } from '../flow/sendApprovePdf.js';

const VALID_PROVIDERS = new Set<IntegratorProvider>([
  'edm',
  'uyumsoft',
  'fit',
  'elogo',
  'qnb',
  'nes',
  'nilvera',
  'izibiz',
]);
const VALID_KINDS = new Set<InvoiceKind>(['efatura', 'earsiv', 'gider_pusulasi']);

function resolveProvider(req: Request): IntegratorProvider {
  const fromQuery = String(req.query.provider ?? '').toLowerCase();
  const fromBody = String(req.body?.provider ?? '').toLowerCase();
  const raw = (fromQuery || fromBody || config.provider) as IntegratorProvider;
  if (!VALID_PROVIDERS.has(raw)) {
    throw Object.assign(new Error(`Geçersiz provider: ${raw}`), { status: 400 });
  }
  return raw;
}

function parseDraft(body: unknown): InvoiceDraftPayload {
  if (!body || typeof body !== 'object') {
    throw Object.assign(new Error('JSON gövde gerekli'), { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const kind = String(b.kind ?? '') as InvoiceKind;
  if (!VALID_KINDS.has(kind)) {
    throw Object.assign(
      new Error('kind zorunlu: efatura | earsiv | gider_pusulasi'),
      { status: 400 },
    );
  }

  const senderVkn = String(b.senderVkn ?? config.defaultSenderVkn ?? '').trim();
  const receiverVknOrTckn = String(b.receiverVknOrTckn ?? '').trim();
  const receiverTitle = String(b.receiverTitle ?? '').trim();
  const issueDate = String(b.issueDate ?? new Date().toISOString().slice(0, 10));

  if (!senderVkn || !receiverVknOrTckn || !receiverTitle) {
    throw Object.assign(
      new Error('senderVkn, receiverVknOrTckn ve receiverTitle zorunlu'),
      { status: 400 },
    );
  }

  const netTotal = Number(b.netTotal ?? 0);
  const vatTotal = Number(b.vatTotal ?? 0);
  const grandTotal = Number(b.grandTotal ?? netTotal + vatTotal);

  return {
    localInvoiceId: b.localInvoiceId ? String(b.localInvoiceId) : undefined,
    ettn: b.ettn ? String(b.ettn) : undefined,
    documentNumber: b.documentNumber ? String(b.documentNumber) : undefined,
    kind,
    issueDate,
    senderVkn,
    receiverVknOrTckn,
    receiverTitle,
    currencyCode: b.currencyCode ? String(b.currencyCode) : 'TRY',
    netTotal,
    vatTotal,
    grandTotal,
    vatRate: b.vatRate !== undefined ? Number(b.vatRate) : undefined,
    ublXml: b.ublXml ? String(b.ublXml) : undefined,
    lines: Array.isArray(b.lines) ? (b.lines as InvoiceDraftPayload['lines']) : undefined,
    metadata:
      b.metadata && typeof b.metadata === 'object'
        ? (b.metadata as Record<string, unknown>)
        : undefined,
  };
}

function handleError(res: Response, err: unknown): void {
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : String(err);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status === 400 ? 'bad_request' : 'integrator_error',
    message,
  });
}

export const invoicesRouter = Router();

/** Bilgi: varsayılan provider */
invoicesRouter.get('/meta/provider', (_req, res) => {
  const integrator = getDefaultIntegrator();
  res.json({
    provider: integrator.provider,
    stubMode: config.stubMode,
    available: [...VALID_PROVIDERS],
  });
});

/**
 * POST /api/invoices/from-transformer/send
 * Örnek köprü: @finatura/invoice-transformers TransformResult → sendInvoice
 *
 * Body: {
 *   transformResult: TransformResult,  // veya summary + draft
 *   ublXml?: string,
 *   localInvoiceId?: string,
 *   senderVkn?: string,
 *   provider?: string,
 *   runFlow?: boolean   // true ise send→approve→pdf
 * }
 */
invoicesRouter.post('/from-transformer/send', async (req, res) => {
  try {
    const provider = resolveProvider(req);
    const body = req.body as Record<string, unknown>;
    const transformResult = (body.transformResult ?? body) as TransformResult;

    if (!transformResult?.summary || typeof transformResult.summary !== 'object') {
      throw Object.assign(
        new Error('transformResult.summary zorunlu (invoice-transformers çıktısı)'),
        { status: 400 },
      );
    }

    const payload = invoiceDraftFromTransformer(transformResult, {
      ublXml: body.ublXml ? String(body.ublXml) : undefined,
      localInvoiceId: body.localInvoiceId ? String(body.localInvoiceId) : undefined,
      senderVkn: body.senderVkn ? String(body.senderVkn) : undefined,
    });

    const integrator = createIntegrator(provider);

    if (body.runFlow) {
      const result = await runSendApprovePdfFlow(integrator, payload, {
        skipApprove: Boolean(body.skipApprove) || payload.kind === 'earsiv',
        accept: body.accept !== false,
      });
      res.status(result.ok ? 200 : 502).json({
        bridgedFrom: 'invoice-transformers',
        payloadPreview: {
          ettn: payload.ettn,
          kind: payload.kind,
          grandTotal: payload.grandTotal,
          hasUbl: Boolean(payload.ublXml),
        },
        flow: result,
      });
      return;
    }

    const result = await integrator.sendInvoice(payload);
    res.status(result.success ? 200 : 502).json({
      bridgedFrom: 'invoice-transformers',
      send: result,
    });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * POST /api/invoices/flow/send-approve-pdf
 * Tek istekte: gönder → onayla → PDF indir iskeleti
 */
invoicesRouter.post('/flow/send-approve-pdf', async (req, res) => {
  try {
    const provider = resolveProvider(req);
    const payload = parseDraft(req.body);
    const integrator = createIntegrator(provider);
    const result = await runSendApprovePdfFlow(integrator, payload, {
      skipApprove: Boolean(req.body?.skipApprove),
      accept: req.body?.accept !== false,
      approveReason: req.body?.approveReason
        ? String(req.body.approveReason)
        : undefined,
    });
    res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * POST /api/invoices/send
 * Body: InvoiceDraftPayload (+ opsiyonel provider)
 */
invoicesRouter.post('/send', async (req, res) => {
  try {
    const provider = resolveProvider(req);
    const payload = parseDraft(req.body);
    const integrator = createIntegrator(provider);
    const result = await integrator.sendInvoice(payload);
    res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * POST /api/invoices/:ettn/approve
 * Body: { accept?: boolean, reason?: string, provider?: string }
 */
invoicesRouter.post('/:ettn/approve', async (req, res) => {
  try {
    const provider = resolveProvider(req);
    const ettn = String(req.params.ettn ?? '').trim();
    if (!ettn) {
      res.status(400).json({ error: 'bad_request', message: 'ettn gerekli' });
      return;
    }
    const integrator = createIntegrator(provider);
    const accept = req.body?.accept !== false;
    const result = await integrator.approveInvoice(ettn, {
      accept,
      reason: req.body?.reason ? String(req.body.reason) : undefined,
    });
    res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /api/invoices/:ettn/pdf?provider=edm
 * JSON: { base64, contentType, ... } — veya Accept: application/pdf ile binary
 */
invoicesRouter.get('/:ettn/pdf', async (req, res) => {
  try {
    const provider = resolveProvider(req);
    const ettn = String(req.params.ettn ?? '').trim();
    if (!ettn) {
      res.status(400).json({ error: 'bad_request', message: 'ettn gerekli' });
      return;
    }
    const integrator = createIntegrator(provider);
    const result = await integrator.downloadPdf(ettn);

    if (!result.success) {
      res.status(502).json(result);
      return;
    }

    const wantsBinary =
      String(req.headers.accept ?? '').includes('application/pdf') ||
      req.query.format === 'binary';

    if (wantsBinary && result.base64) {
      const buf = Buffer.from(result.base64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.fileName ?? `${ettn}.pdf`}"`,
      );
      res.send(buf);
      return;
    }

    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /api/invoices/:ettn/status
 */
invoicesRouter.get('/:ettn/status', async (req, res) => {
  try {
    const provider = resolveProvider(req);
    const ettn = String(req.params.ettn ?? '').trim();
    const integrator = createIntegrator(provider);
    const result = await integrator.getStatus(ettn);
    res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    handleError(res, err);
  }
});
