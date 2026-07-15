import type {
  CreatePaymentRequest,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  PaymentWebhookEvent,
} from './types.js';

/**
 * İyzico / PayTR tarzı ödeme geçidi sözleşmesi.
 *
 * Gerçek sağlayıcılar bu interface'i uygular; geliştirme/test için StubAdapter kullanılır.
 */
export interface PaymentGatewayAdapter {
  readonly provider: PaymentProvider;

  /** Hostlu / 3D ödeme oturumu başlat */
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult>;

  /**
   * Webhook imza / hash doğrulama.
   * headers: gelen HTTP header'ları (küçük harf anahtar tercih edilir)
   * rawBody: parse edilmemiş gövde — HMAC için zorunlu
   */
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer,
  ): Promise<boolean>;

  /** Doğrulanmış (veya stub) gövdeyi standart olaya çevir */
  parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer,
  ): Promise<PaymentWebhookEvent>;

  /** İsteğe bağlı durum sorgusu */
  getPaymentStatus?(paymentId: string): Promise<PaymentStatus>;
}

export function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0];
  return direct;
}
