import { createHash, randomUUID } from 'node:crypto';
import type { PaymentGatewayAdapter } from './adapter.js';
import { headerValue } from './adapter.js';
import type {
  CreatePaymentRequest,
  CreatePaymentResult,
  PaymentStatus,
  PaymentWebhookEvent,
  WebhookEventType,
} from './types.js';
import { PaymentProviderError } from './types.js';

/**
 * Geliştirme / entegrasyon stub'ı.
 * İyzico veya PayTR SDK yerine geçer; gerçek para tahsil etmez.
 *
 * Webhook simülasyonu:
 *   Header `x-stub-signature: ok`  → doğrulama geçer
 *   Body JSON: { conversationId, paymentId?, eventType?, paidAmount? }
 */
export class StubPaymentAdapter implements PaymentGatewayAdapter {
  readonly provider = 'stub' as const;

  private readonly statuses = new Map<string, PaymentStatus>();

  async createPayment(
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResult> {
    if (!(request.amount > 0)) {
      throw new PaymentProviderError('stub: amount pozitif olmalı');
    }

    const paymentId = `stub_pay_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const token = createHash('sha256')
      .update(`${paymentId}:${request.conversationId}`)
      .digest('hex')
      .slice(0, 32);

    this.statuses.set(paymentId, 'redirect');

    const redirectUrl =
      `${request.callbackUrl}` +
      `${request.callbackUrl.includes('?') ? '&' : '?'}` +
      `conversationId=${encodeURIComponent(request.conversationId)}` +
      `&paymentId=${encodeURIComponent(paymentId)}` +
      `&token=${encodeURIComponent(token)}` +
      `&provider=stub`;

    return {
      provider: this.provider,
      paymentId,
      conversationId: request.conversationId,
      status: 'redirect',
      redirectUrl,
      token,
      message: 'Stub ödeme oturumu oluşturuldu (gerçek tahsilat yok)',
      raw: {
        tenantId: request.tenantId,
        packageCode: request.packageCode,
        kontorAmount: request.kontorAmount,
        amount: request.amount,
      },
    };
  }

  async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    _rawBody: string | Buffer,
  ): Promise<boolean> {
    const sig = headerValue(headers, 'x-stub-signature');
    // Geliştirmede kolaylık: imza yoksa veya "ok" ise kabul
    return sig === undefined || sig === '' || sig === 'ok';
  }

  async parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer,
  ): Promise<PaymentWebhookEvent> {
    const text =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    let body: Record<string, unknown> = {};
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      throw new PaymentProviderError('stub webhook: geçersiz JSON');
    }

    const conversationId = String(
      body.conversationId ?? body.conversation_id ?? '',
    );
    const paymentId = String(
      body.paymentId ?? body.payment_id ?? `stub_pay_${randomUUID().slice(0, 8)}`,
    );

    if (!conversationId) {
      throw new PaymentProviderError('stub webhook: conversationId zorunlu');
    }

    const eventType = normalizeEventType(body.eventType ?? body.status);
    const paidAmount =
      typeof body.paidAmount === 'number'
        ? body.paidAmount
        : typeof body.paid_amount === 'number'
          ? body.paid_amount
          : undefined;

    if (eventType === 'payment.success') {
      this.statuses.set(paymentId, 'paid');
    } else if (eventType === 'payment.failed') {
      this.statuses.set(paymentId, 'failed');
    } else if (eventType === 'payment.refund') {
      this.statuses.set(paymentId, 'refunded');
    }

    return {
      provider: this.provider,
      eventType,
      paymentId,
      conversationId,
      paidAmount,
      currency: typeof body.currency === 'string' ? body.currency : 'TRY',
      raw: {
        headers: {
          'x-stub-signature': headerValue(headers, 'x-stub-signature'),
        },
        body,
      },
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return this.statuses.get(paymentId) ?? 'pending';
  }
}

function normalizeEventType(raw: unknown): WebhookEventType {
  const value = String(raw ?? 'payment.success').toLowerCase();
  if (
    value === 'payment.success' ||
    value === 'success' ||
    value === 'paid'
  ) {
    return 'payment.success';
  }
  if (value === 'payment.failed' || value === 'failed' || value === 'failure') {
    return 'payment.failed';
  }
  if (value === 'payment.refund' || value === 'refund' || value === 'refunded') {
    return 'payment.refund';
  }
  return 'unknown';
}
