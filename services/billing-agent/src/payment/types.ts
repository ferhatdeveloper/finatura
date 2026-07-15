/**
 * Ödeme geçidi tipleri (Aşama 6.2 + bayilik).
 * Gerçek sağlayıcılar (İyzico / PayTR) bu sözleşmeye adapter ile bağlanır.
 */

import type { EinvoiceProviderCode, KontorReferenceType } from '../types.js';

export type PaymentProvider = 'stub' | 'iyzico' | 'paytr';

export type PaymentStatus =
  | 'pending'
  | 'redirect'
  | 'paid'
  | 'failed'
  | 'refunded';

export type CheckoutStatus = 'created' | 'awaiting_payment' | 'fulfilled' | 'failed';

/**
 * Paket cinsi — bayilik kataloğu:
 *   topup           genel hızlı yükleme
 *   plan            abonelik (seed plan ile hizalı)
 *   efatura_kontor  e-fatura gönderim kontörü
 *   ocr_kontor      OCR sorgu kontörü
 *   mixed           e-fatura + OCR karma paket
 */
export type PackageKind =
  | 'topup'
  | 'plan'
  | 'efatura_kontor'
  | 'ocr_kontor'
  | 'mixed';

export type BillingPeriod = 'one_time' | 'monthly' | 'yearly';

/**
 * Karma pakette tahmini dağılım (bilgilendirme / raporlama).
 * Bakiye tek havuzdur; ayrım ledger.reference_type ile yapılır.
 */
export interface KontorPackageBuckets {
  efatura?: number;
  ocr?: number;
  general?: number;
}

/** Satın alınabilir kontör / paket tanımı (katalog) */
export interface KontorPackage {
  code: string;
  nameTr: string;
  description: string;
  /** Yüklenecek toplam kontör miktarı (ledger credit tutarı) */
  kontorAmount: number;
  /** TL fiyat (KDV hariç veya brüt — katalog notuna bakın) */
  priceAmount: number;
  currencyCode: 'TRY';
  kind: PackageKind;
  billingPeriod: BillingPeriod;
  active: boolean;
  /**
   * Karma paketlerde efatura/ocr dağılımı (opsiyonel metadata).
   * Örn. mixed_200 → { efatura: 100, ocr: 100 }
   */
  buckets?: KontorPackageBuckets;
  /**
   * Opsiyonel: paket belirli entegratör için fiyatlandırılmış / vurgulu.
   * null/undefined → tüm sağlayıcılara uygun genel paket.
   */
  providerHint?: EinvoiceProviderCode | null;
}

/** Paket kind → fulfillment credit reference_type */
export function creditReferenceTypeForKind(
  kind: PackageKind,
): Extract<
  KontorReferenceType,
  | 'payment_topup'
  | 'payment_efatura_kontor'
  | 'payment_ocr_kontor'
  | 'payment_mixed_kontor'
> {
  switch (kind) {
    case 'efatura_kontor':
      return 'payment_efatura_kontor';
    case 'ocr_kontor':
      return 'payment_ocr_kontor';
    case 'mixed':
      return 'payment_mixed_kontor';
    case 'topup':
    case 'plan':
      return 'payment_topup';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export interface PaymentBuyer {
  id: string;
  email?: string;
  name?: string;
  gsm?: string;
}

/** Adapter'a ödeme başlatma isteği */
export interface CreatePaymentRequest {
  tenantId: string;
  packageCode: string;
  /** Tahsil edilecek tutar (TRY) */
  amount: number;
  currency: 'TRY';
  buyer: PaymentBuyer;
  /** Bizim sipariş / konuşma kimliği — webhook eşlemesi */
  conversationId: string;
  callbackUrl: string;
  /** Kontör miktarı (metadata; webhook fulfill için) */
  kontorAmount: number;
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  provider: PaymentProvider;
  paymentId: string;
  conversationId: string;
  status: Extract<PaymentStatus, 'pending' | 'redirect' | 'failed'>;
  /** 3D / hostlu ödeme sayfası */
  redirectUrl?: string;
  /** İyzico token / PayTR token vb. */
  token?: string;
  message?: string;
  raw?: unknown;
}

export type WebhookEventType =
  | 'payment.success'
  | 'payment.failed'
  | 'payment.refund'
  | 'unknown';

export interface PaymentWebhookEvent {
  provider: PaymentProvider;
  eventType: WebhookEventType;
  paymentId: string;
  conversationId: string;
  paidAmount?: number;
  currency?: string;
  /** Sağlayıcı ham gövdesi (denetim / debug) */
  raw: unknown;
}

export interface CheckoutSession {
  conversationId: string;
  tenantId: string;
  packageCode: string;
  /** Katalog paket cinsi — fulfillment reference_type seçimi için */
  packageKind: PackageKind;
  kontorAmount: number;
  priceAmount: number;
  currencyCode: 'TRY';
  provider: PaymentProvider;
  paymentId: string | null;
  status: CheckoutStatus;
  redirectUrl: string | null;
  createdAt: string;
}

export class PaymentValidationError extends Error {
  readonly code = 'payment_validation_error' as const;

  constructor(message: string) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

export class PaymentProviderError extends Error {
  readonly code = 'payment_provider_error' as const;

  constructor(message: string) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}
