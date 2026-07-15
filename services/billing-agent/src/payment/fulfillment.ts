import { kontorLedger } from '../kontor/ledger.js';
import {
  getCheckoutSession,
  markCheckoutFailed,
  markCheckoutFulfilled,
} from './checkout.js';
import { getPackageByCode } from './packages.js';
import type { PaymentWebhookEvent } from './types.js';
import {
  creditReferenceTypeForKind,
  PaymentValidationError,
} from './types.js';

export interface FulfillmentResult {
  handled: boolean;
  credited: boolean;
  idempotentReplay: boolean;
  conversationId: string;
  tenantId: string | null;
  kontorAmount: number | null;
  /** Fulfillment'ta kullanılan ledger reference_type */
  referenceType: string | null;
  packageKind: string | null;
  ledgerEntryId: string | null;
  message: string;
}

function emptyResult(
  partial: Omit<
    FulfillmentResult,
    'referenceType' | 'packageKind' | 'kontorAmount' | 'ledgerEntryId' | 'tenantId'
  > & {
    tenantId?: string | null;
    kontorAmount?: number | null;
    ledgerEntryId?: string | null;
  },
): FulfillmentResult {
  return {
    tenantId: partial.tenantId ?? null,
    kontorAmount: partial.kontorAmount ?? null,
    ledgerEntryId: partial.ledgerEntryId ?? null,
    referenceType: null,
    packageKind: null,
    ...partial,
  };
}

/**
 * Başarılı ödeme webhook'undan kontör credit.
 * reference_type paket cinsine göre:
 *   payment_topup | payment_efatura_kontor | payment_ocr_kontor | payment_mixed_kontor
 * reference_id=conversationId → idempotent.
 */
export async function fulfillWebhookEvent(
  event: PaymentWebhookEvent,
): Promise<FulfillmentResult> {
  const { conversationId, eventType } = event;

  if (eventType === 'payment.failed') {
    markCheckoutFailed(conversationId);
    return emptyResult({
      handled: true,
      credited: false,
      idempotentReplay: false,
      conversationId,
      message: 'Ödeme başarısız olarak işaretlendi',
    });
  }

  if (eventType === 'payment.refund') {
    // İade ledger politikası sonraki iterasyon (refund entry_type)
    return emptyResult({
      handled: true,
      credited: false,
      idempotentReplay: false,
      conversationId,
      message: 'İade olayı alındı; otomatik kontör düşümü henüz yok',
    });
  }

  if (eventType !== 'payment.success') {
    return emptyResult({
      handled: false,
      credited: false,
      idempotentReplay: false,
      conversationId,
      message: `İşlenmeyen olay: ${eventType}`,
    });
  }

  const session = getCheckoutSession(conversationId);
  if (!session) {
    throw new PaymentValidationError(
      `Checkout oturumu bulunamadı: ${conversationId}. ` +
        'Üretimde oturumlar central DB\'de saklanmalıdır.',
    );
  }

  if (session.status === 'fulfilled') {
    return emptyResult({
      handled: true,
      credited: false,
      idempotentReplay: true,
      conversationId,
      tenantId: session.tenantId,
      kontorAmount: session.kontorAmount,
      message: 'Oturum zaten fulfill edilmiş',
    });
  }

  const pkg = getPackageByCode(session.packageCode);
  const referenceType = creditReferenceTypeForKind(pkg.kind);

  const bucketNote = pkg.buckets
    ? ` buckets=${JSON.stringify(pkg.buckets)}`
    : '';
  const providerNote = pkg.providerHint
    ? ` providerHint=${pkg.providerHint}`
    : '';

  const credit = await kontorLedger.credit({
    tenantId: session.tenantId,
    amount: pkg.kontorAmount,
    referenceType,
    referenceId: conversationId,
    description:
      `Ödeme paketi ${pkg.code} (${pkg.kind}) (+${pkg.kontorAmount} kontör)` +
      `${bucketNote}${providerNote} [${event.provider}:${event.paymentId}]`,
    idempotent: true,
  });

  markCheckoutFulfilled(conversationId);

  return {
    handled: true,
    credited: !credit.idempotentReplay,
    idempotentReplay: credit.idempotentReplay,
    conversationId,
    tenantId: session.tenantId,
    kontorAmount: pkg.kontorAmount,
    referenceType,
    packageKind: pkg.kind,
    ledgerEntryId: credit.entry.id,
    message: credit.idempotentReplay
      ? 'Kontör daha önce yüklenmiş (idempotent)'
      : 'Kontör bakiyeye işlendi',
  };
}
