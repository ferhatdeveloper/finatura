import type { NextFunction, Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { config } from '../config.js';
import { forwardUpstream, sendUpstreamResult } from './forwardUpstream.js';

/**
 * /v1/kontor/* → BILLING_AGENT_URL/api/kontor/*
 * /v1/billing/payment/* → /api/payment/*
 * /v1/billing/einvoice/* → /api/einvoice/* (provider config)
 */
export function createKontorProxy(): Router {
  return createBillingMountProxy('/api/kontor');
}

export function createBillingPaymentProxy(): Router {
  return createBillingMountProxy('/api/payment');
}

export function createBillingEinvoiceConfigProxy(): Router {
  return createBillingMountProxy('/api/einvoice');
}

function createBillingMountProxy(upstreamPrefix: string): Router {
  const router = createRouter();

  router.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.tenantId ?? req.header(config.tenantHeader);
      const search = req.url.includes('?')
        ? req.url.slice(req.url.indexOf('?') + 1)
        : undefined;

      const result = await forwardUpstream(req, res, {
        baseUrl: config.billingAgentUrl,
        upstreamPrefix,
        suffixPath: req.path,
        search,
        timeoutMs: config.agentProxyTimeoutMs,
        label: 'billing-agent',
        extraHeaders: tenantId ? { 'X-Tenant-ID': tenantId } : undefined,
      });

      sendUpstreamResult(res, result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
