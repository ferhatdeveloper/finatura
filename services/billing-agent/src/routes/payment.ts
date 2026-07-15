import { Router } from 'express';
import { requireTenantHeader } from '../middleware/tenantHeader.js';
import {
  getCheckoutSession,
  listActivePackages,
  PaymentProviderError,
  PaymentValidationError,
  processPaymentWebhook,
  startCheckout,
} from '../payment/index.js';

export const paymentRouter = Router();

function handlePaymentError(
  res: import('express').Response,
  err: unknown,
): void {
  if (err instanceof PaymentValidationError) {
    res.status(400).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof PaymentProviderError) {
    res.status(502).json({ error: err.code, message: err.message });
    return;
  }
  console.error('[payment]', err);
  res.status(500).json({ error: 'internal_error' });
}

/** GET /api/payment/packages — aktif kontör / paket kataloğu (tenant gerekmez)
 * Query: ?kind=efatura_kontor|ocr_kontor|mixed|topup|plan
 */
paymentRouter.get('/packages', (req, res) => {
  const kindRaw = typeof req.query.kind === 'string' ? req.query.kind : undefined;
  const kind =
    kindRaw === 'topup' ||
    kindRaw === 'plan' ||
    kindRaw === 'efatura_kontor' ||
    kindRaw === 'ocr_kontor' ||
    kindRaw === 'mixed'
      ? kindRaw
      : undefined;

  res.json({
    items: listActivePackages(kind ? { kind } : undefined),
  });
});

/**
 * POST /api/payment/checkout
 * Body: { packageCode, buyer: { id, email?, name?, gsm? }, callbackUrl? }
 * Header: X-Tenant-ID
 */
paymentRouter.post('/checkout', requireTenantHeader, async (req, res) => {
  try {
    const packageCode = String(req.body?.packageCode ?? '');
    const buyerRaw = req.body?.buyer ?? {};
    const buyer = {
      id: String(buyerRaw.id ?? ''),
      email: typeof buyerRaw.email === 'string' ? buyerRaw.email : undefined,
      name: typeof buyerRaw.name === 'string' ? buyerRaw.name : undefined,
      gsm: typeof buyerRaw.gsm === 'string' ? buyerRaw.gsm : undefined,
    };
    const callbackUrl =
      typeof req.body?.callbackUrl === 'string'
        ? req.body.callbackUrl
        : undefined;

    const session = await startCheckout({
      tenantId: req.tenantId!,
      packageCode,
      buyer,
      callbackUrl,
    });

    res.status(201).json({
      ok: true,
      checkout: session,
    });
  } catch (err) {
    handlePaymentError(res, err);
  }
});

/** GET /api/payment/checkout/:conversationId */
paymentRouter.get(
  '/checkout/:conversationId',
  requireTenantHeader,
  (req, res) => {
    try {
      const session = getCheckoutSession(req.params.conversationId);
      if (!session || session.tenantId !== req.tenantId) {
        res.status(404).json({
          error: 'checkout_not_found',
          message: 'Checkout oturumu bulunamadı',
        });
        return;
      }
      res.json({ checkout: session });
    } catch (err) {
      handlePaymentError(res, err);
    }
  },
);

/**
 * POST /api/payment/webhook
 * Stub: JSON body + opsiyonel Header x-stub-signature: ok
 *
 * Not: İyzico/PayTR bağlandığında bu uç raw body ile HMAC doğrular.
 * Şimdilik express.json sonrası body yeniden stringify edilir (stub için yeterli).
 */
paymentRouter.post('/webhook', async (req, res) => {
  try {
    const rawBody =
      typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body
        : JSON.stringify(req.body ?? {});

    const result = await processPaymentWebhook({
      headers: req.headers as Record<string, string | string[] | undefined>,
      rawBody,
    });

    res.status(200).json({
      ok: true,
      verified: result.verified,
      event: result.event
        ? {
            provider: result.event.provider,
            eventType: result.event.eventType,
            paymentId: result.event.paymentId,
            conversationId: result.event.conversationId,
          }
        : null,
      fulfillment: result.fulfillment,
    });
  } catch (err) {
    if (err instanceof PaymentProviderError) {
      res.status(401).json({ error: err.code, message: err.message });
      return;
    }
    handlePaymentError(res, err);
  }
});
