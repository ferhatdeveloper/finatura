import type { NextFunction, Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { config } from '../config.js';
import { forwardUpstream, sendUpstreamResult } from './forwardUpstream.js';

/**
 * /v1/einvoice/* → EINVOICE_INTEGRATOR_URL/api/invoices/*
 *
 * Başarılı gönderim sonrası (DEBIT_KONTOR_ON_EINVOICE_SEND):
 * billing-agent POST /api/kontor/debit/efatura
 */
export function createEinvoiceProxy(): Router {
  const router = createRouter();

  router.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handleEinvoiceProxy(req, res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function isSendPath(path: string): boolean {
  return (
    path === '/send' ||
    path === '/from-transformer/send' ||
    path === '/flow/send-approve-pdf'
  );
}

function sendSucceeded(status: number, json: unknown): boolean {
  if (status < 200 || status >= 300 || json === null || typeof json !== 'object') {
    return false;
  }
  const body = json as Record<string, unknown>;
  if (typeof body.success === 'boolean') return body.success;
  if (typeof body.ok === 'boolean') return body.ok;
  if (body.send && typeof body.send === 'object') {
    return Boolean((body.send as { success?: boolean }).success);
  }
  if (body.flow && typeof body.flow === 'object') {
    return Boolean((body.flow as { ok?: boolean }).ok);
  }
  return status === 200;
}

function resolveInvoiceId(req: Request, json: unknown): string | null {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.localInvoiceId === 'string' && body.localInvoiceId.trim()) {
    return body.localInvoiceId.trim();
  }
  if (json && typeof json === 'object') {
    const j = json as Record<string, unknown>;
    for (const key of ['localInvoiceId', 'invoiceId', 'ettn', 'id']) {
      const v = j[key];
      if (typeof v === 'string' && v.trim().length >= 8) return v.trim();
    }
    const send = j.send;
    if (send && typeof send === 'object') {
      const s = send as Record<string, unknown>;
      for (const key of ['localInvoiceId', 'invoiceId', 'ettn', 'id']) {
        const v = s[key];
        if (typeof v === 'string' && v.trim().length >= 8) return v.trim();
      }
    }
  }
  if (typeof body.ettn === 'string' && body.ettn.trim().length >= 8) {
    return body.ettn.trim();
  }
  return null;
}

async function debitEfaturaKontor(
  req: Request,
  invoiceId: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const base = config.billingAgentUrl.replace(/\/$/, '');
  const tenantId = req.tenant?.tenantId ?? req.header(config.tenantHeader);
  if (!tenantId) {
    return {
      ok: false,
      status: 400,
      body: { error: 'missing_tenant_id', message: 'X-Tenant-ID gerekli' },
    };
  }

  try {
    const upstream = await fetch(`${base}/api/kontor/debit/efatura`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Forwarded-By': 'api-gateway',
        ...(req.auth?.userId ? { 'X-User-ID': req.auth.userId } : {}),
      },
      body: JSON.stringify({
        invoiceId,
        createdBy: req.auth?.userId ?? null,
      }),
      signal: AbortSignal.timeout(config.agentProxyTimeoutMs),
    });
    const text = await upstream.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    return {
      ok: upstream.ok,
      status: upstream.status,
      body,
    };
  } catch (err) {
    console.error('[einvoice-proxy] kontör debit', err);
    return {
      ok: false,
      status: 502,
      body: {
        error: 'billing_unreachable',
        message: 'Kontör düşümü için billing-agent erişilemedi',
      },
    };
  }
}

async function handleEinvoiceProxy(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenant?.tenantId ?? req.header(config.tenantHeader);
  const search = req.url.includes('?')
    ? req.url.slice(req.url.indexOf('?') + 1)
    : undefined;

  const result = await forwardUpstream(req, res, {
    baseUrl: config.einvoiceIntegratorUrl,
    upstreamPrefix: '/api/invoices',
    suffixPath: req.path,
    search,
    timeoutMs: config.agentProxyTimeoutMs,
    label: 'einvoice-integrator',
    extraHeaders: tenantId ? { 'X-Tenant-ID': tenantId } : undefined,
  });

  if (res.headersSent) return;

  let responseJson = result.json;
  if (
    config.debitKontorOnEinvoiceSend &&
    req.method.toUpperCase() === 'POST' &&
    isSendPath(req.path) &&
    sendSucceeded(result.status, result.json)
  ) {
    const invoiceId = resolveInvoiceId(req, result.json);
    if (invoiceId) {
      const debit = await debitEfaturaKontor(req, invoiceId);
      if (responseJson && typeof responseJson === 'object') {
        responseJson = {
          ...(responseJson as Record<string, unknown>),
          kontorDebit: debit.body,
          kontorDebitOk: debit.ok,
        };
      }
      if (!debit.ok && debit.status === 402) {
        // Gönderim oldu ama kontör yetersiz — gönderim cevabını koru, uyarı ekle
        console.warn(
          `[einvoice-proxy] e-fatura gönderildi fakat kontör düşümü başarısız: ${invoiceId}`,
        );
      }
    } else {
      console.warn(
        '[einvoice-proxy] başarılı gönderimde invoiceId çözülemedi — kontör düşülmedi',
      );
    }
  }

  if (responseJson !== result.json && responseJson !== null) {
    res.status(result.status).json(responseJson);
    return;
  }

  sendUpstreamResult(res, result);
}
