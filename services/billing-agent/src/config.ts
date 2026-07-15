import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Eksik ortam değişkeni: ${name}`);
  }
  return value;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`${name} geçerli bir sayı olmalı, gelen: ${raw}`);
  }
  return n;
}

function decimalEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n) || n < 0) {
    throw new Error(`${name} geçerli negatif olmayan bir sayı olmalı, gelen: ${raw}`);
  }
  return n;
}

function paymentProviderEnv(): 'stub' | 'iyzico' | 'paytr' {
  const raw = (process.env.PAYMENT_PROVIDER ?? 'stub').toLowerCase();
  if (raw === 'stub' || raw === 'iyzico' || raw === 'paytr') return raw;
  throw new Error(
    `PAYMENT_PROVIDER stub | iyzico | paytr olmalı, gelen: ${raw}`,
  );
}

export const config = {
  port: intEnv('PORT', 3200),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  centralDatabaseUrl: process.env.CENTRAL_DATABASE_URL ?? '',
  /** OCR / e-fatura işlem başına kontör maliyetleri */
  costs: {
    ocrSozlesme: decimalEnv('KONTOR_COST_OCR_SOZLESME', 1),
    ocrKimlik: decimalEnv('KONTOR_COST_OCR_KIMLIK', 1),
    ocrTapu: decimalEnv('KONTOR_COST_OCR_TAPU', 1),
    efaturaSend: decimalEnv('KONTOR_COST_EFATURA_SEND', 2),
  },
  /** Aşama 6.2 — ödeme geçidi */
  payment: {
    provider: paymentProviderEnv(),
    defaultCallbackUrl:
      process.env.PAYMENT_CALLBACK_URL ??
      'http://localhost:3200/api/payment/callback',
    /** İyzico (gelecek) */
    iyzico: {
      apiKey: process.env.IYZICO_API_KEY ?? '',
      secretKey: process.env.IYZICO_SECRET_KEY ?? '',
      baseUrl:
        process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com',
    },
    /** PayTR (gelecek) */
    paytr: {
      merchantId: process.env.PAYTR_MERCHANT_ID ?? '',
      merchantKey: process.env.PAYTR_MERCHANT_KEY ?? '',
      merchantSalt: process.env.PAYTR_MERCHANT_SALT ?? '',
    },
  },
} as const;

export function assertConfig(): void {
  required('CENTRAL_DATABASE_URL');
}
