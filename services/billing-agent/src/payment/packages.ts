import type { KontorPackage, PackageKind } from './types.js';
import { PaymentValidationError } from './types.js';

/**
 * Uygulama içi kontör / paket kataloğu (Finatura reseller).
 *
 * Abonelik plan seed'leri: `database/central/02_seed_plans.sql`
 * Tenant entegratör: `database/central/03_einvoice_reseller.sql`
 *
 * Paket türleri:
 *   topup           — genel hızlı yükleme
 *   plan            — abonelik (seed ile hizalı)
 *   efatura_kontor  — e-fatura gönderim kontörü
 *   ocr_kontor      — OCR sorgu kontörü
 *   mixed           — karma (buckets metadata)
 *
 * providerHint: edm | uyumsoft | fit | elogo | qnb | nes | nilvera | izibiz
 *   — opsiyonel; genel paketlerde yok.
 */
export const KONTOR_PACKAGES: readonly KontorPackage[] = [
  // --- Genel top-up ---
  {
    code: 'topup_50',
    nameTr: 'Hızlı 50',
    description: 'Acil OCR / e-fatura için küçük kontör yüklemesi',
    kontorAmount: 50,
    priceAmount: 499,
    currencyCode: 'TRY',
    kind: 'topup',
    billingPeriod: 'one_time',
    active: true,
  },
  {
    code: 'topup_200',
    nameTr: 'Standart 200',
    description: 'Haftalık kullanım için tek seferlik paket',
    kontorAmount: 200,
    priceAmount: 1499,
    currencyCode: 'TRY',
    kind: 'topup',
    billingPeriod: 'one_time',
    active: true,
  },
  {
    code: 'topup_500',
    nameTr: 'Yoğun 500',
    description: 'Yoğun dönem için tek seferlik kontör',
    kontorAmount: 500,
    priceAmount: 2999,
    currencyCode: 'TRY',
    kind: 'topup',
    billingPeriod: 'one_time',
    active: true,
  },

  // --- e-Fatura kontör (bayilik) ---
  {
    code: 'efatura_100',
    nameTr: 'e-Fatura 100',
    description: '100 e-fatura gönderim kontörü — Finatura reseller',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
  },
  {
    code: 'efatura_500',
    nameTr: 'e-Fatura 500',
    description: '500 e-fatura gönderim kontörü — Finatura reseller',
    kontorAmount: 500,
    priceAmount: 3499,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 500 },
  },
  {
    code: 'efatura_1000',
    nameTr: 'e-Fatura 1000',
    description: '1000 e-fatura gönderim kontörü — Finatura reseller',
    kontorAmount: 1000,
    priceAmount: 5999,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 1000 },
  },
  // Provider vurgulu örnekler (opsiyonel metadata; aynı kontör havuzuna yükler)
  {
    code: 'efatura_edm_100',
    nameTr: 'e-Fatura 100 (EDM)',
    description: 'EDM hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'edm',
  },
  {
    code: 'efatura_uyumsoft_100',
    nameTr: 'e-Fatura 100 (Uyumsoft)',
    description: 'Uyumsoft hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'uyumsoft',
  },
  {
    code: 'efatura_fit_100',
    nameTr: 'e-Fatura 100 (FIT)',
    description: 'FIT hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'fit',
  },
  {
    code: 'efatura_elogo_100',
    nameTr: 'e-Fatura 100 (eLogo)',
    description: 'Logo eLogo hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'elogo',
  },
  {
    code: 'efatura_qnb_100',
    nameTr: 'e-Fatura 100 (QNB)',
    description: 'QNB eSolutions hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'qnb',
  },
  {
    code: 'efatura_nes_100',
    nameTr: 'e-Fatura 100 (NES)',
    description: 'NES hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'nes',
  },
  {
    code: 'efatura_nilvera_100',
    nameTr: 'e-Fatura 100 (Nilvera)',
    description: 'Nilvera hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'nilvera',
  },
  {
    code: 'efatura_izibiz_100',
    nameTr: 'e-Fatura 100 (İzibiz)',
    description: 'İzibiz hesabı için önerilen 100 kontör paketi',
    kontorAmount: 100,
    priceAmount: 899,
    currencyCode: 'TRY',
    kind: 'efatura_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100 },
    providerHint: 'izibiz',
  },

  // --- OCR kontör ---
  {
    code: 'ocr_100',
    nameTr: 'OCR 100',
    description: '100 OCR sorgu kontörü (sözleşme / kimlik / tapu)',
    kontorAmount: 100,
    priceAmount: 799,
    currencyCode: 'TRY',
    kind: 'ocr_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { ocr: 100 },
  },
  {
    code: 'ocr_300',
    nameTr: 'OCR 300',
    description: '300 OCR sorgu kontörü',
    kontorAmount: 300,
    priceAmount: 1999,
    currencyCode: 'TRY',
    kind: 'ocr_kontor',
    billingPeriod: 'one_time',
    active: true,
    buckets: { ocr: 300 },
  },

  // --- Karma ---
  {
    code: 'mixed_200',
    nameTr: 'Karma 200',
    description: '100 e-fatura + 100 OCR kontör (tek seferlik)',
    kontorAmount: 200,
    priceAmount: 1599,
    currencyCode: 'TRY',
    kind: 'mixed',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 100, ocr: 100 },
  },
  {
    code: 'mixed_600',
    nameTr: 'Karma 600',
    description: '400 e-fatura + 200 OCR kontör',
    kontorAmount: 600,
    priceAmount: 3999,
    currencyCode: 'TRY',
    kind: 'mixed',
    billingPeriod: 'one_time',
    active: true,
    buckets: { efatura: 400, ocr: 200 },
  },

  // --- Abonelik planları (seed ile hizalı) ---
  {
    code: 'starter',
    nameTr: 'Başlangıç (aylık)',
    description: 'Küçük işletmeler için aylık paket — seed plan ile uyumlu',
    kontorAmount: 200,
    priceAmount: 1499,
    currencyCode: 'TRY',
    kind: 'plan',
    billingPeriod: 'monthly',
    active: true,
  },
  {
    code: 'business',
    nameTr: 'İşletme (aylık)',
    description: 'Yoğun kullanım için aylık paket — seed plan ile uyumlu',
    kontorAmount: 750,
    priceAmount: 3999,
    currencyCode: 'TRY',
    kind: 'plan',
    billingPeriod: 'monthly',
    active: true,
  },
  {
    code: 'yearly',
    nameTr: 'Yıllık İş',
    description: 'İşletme planının yıllık hali — seed plan ile uyumlu',
    kontorAmount: 9000,
    priceAmount: 39990,
    currencyCode: 'TRY',
    kind: 'plan',
    billingPeriod: 'yearly',
    active: true,
  },
] as const;

export function listActivePackages(filter?: {
  kind?: PackageKind;
}): KontorPackage[] {
  return KONTOR_PACKAGES.filter((p) => {
    if (!p.active) return false;
    if (filter?.kind && p.kind !== filter.kind) return false;
    return true;
  });
}

export function getPackageByCode(code: string): KontorPackage {
  const found = KONTOR_PACKAGES.find((p) => p.code === code && p.active);
  if (!found) {
    throw new PaymentValidationError(
      `Bilinmeyen veya pasif paket kodu: ${code}`,
    );
  }
  return found;
}
