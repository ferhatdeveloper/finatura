import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { getPaymentAdapter } from './createAdapter.js';
import { getPackageByCode } from './packages.js';
import type { CheckoutSession, PaymentBuyer } from './types.js';
import { PaymentValidationError } from './types.js';

/** Bellek içi oturum — üretimde central DB tablosuna taşınır */
const sessions = new Map<string, CheckoutSession>();

function assertTenantId(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw new PaymentValidationError('tenantId zorunlu');
  }
}

/**
 * Paket seç → sağlayıcıda ödeme oturumu aç → yönlendirme bilgisi döndür.
 */
export async function startCheckout(params: {
  tenantId: string;
  packageCode: string;
  buyer: PaymentBuyer;
  callbackUrl?: string;
}): Promise<CheckoutSession> {
  const { tenantId, packageCode, buyer } = params;
  assertTenantId(tenantId);

  if (!buyer?.id?.trim()) {
    throw new PaymentValidationError('buyer.id zorunlu');
  }

  const pkg = getPackageByCode(packageCode);
  const conversationId = randomUUID();
  const callbackUrl =
    params.callbackUrl?.trim() || config.payment.defaultCallbackUrl;

  const adapter = getPaymentAdapter();
  const created = await adapter.createPayment({
    tenantId,
    packageCode: pkg.code,
    amount: pkg.priceAmount,
    currency: pkg.currencyCode,
    buyer,
    conversationId,
    callbackUrl,
    kontorAmount: pkg.kontorAmount,
    metadata: {
      packageKind: pkg.kind,
      billingPeriod: pkg.billingPeriod,
      ...(pkg.providerHint ? { providerHint: pkg.providerHint } : {}),
      ...(pkg.buckets ? { buckets: JSON.stringify(pkg.buckets) } : {}),
    },
  });

  const session: CheckoutSession = {
    conversationId,
    tenantId,
    packageCode: pkg.code,
    packageKind: pkg.kind,
    kontorAmount: pkg.kontorAmount,
    priceAmount: pkg.priceAmount,
    currencyCode: pkg.currencyCode,
    provider: created.provider,
    paymentId: created.paymentId,
    status:
      created.status === 'failed' ? 'failed' : 'awaiting_payment',
    redirectUrl: created.redirectUrl ?? null,
    createdAt: new Date().toISOString(),
  };

  sessions.set(conversationId, session);
  return session;
}

export function getCheckoutSession(
  conversationId: string,
): CheckoutSession | null {
  return sessions.get(conversationId) ?? null;
}

export function markCheckoutFulfilled(conversationId: string): void {
  const session = sessions.get(conversationId);
  if (!session) return;
  session.status = 'fulfilled';
  sessions.set(conversationId, session);
}

export function markCheckoutFailed(conversationId: string): void {
  const session = sessions.get(conversationId);
  if (!session) return;
  session.status = 'failed';
  sessions.set(conversationId, session);
}

/** Test yardımcısı */
export function _resetCheckoutSessionsForTests(): void {
  sessions.clear();
}
