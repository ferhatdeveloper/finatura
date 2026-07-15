/**
 * Central DB şema referansı (SQL bu serviste yazılmaz — database/central/01_schema.sql):
 *
 *   public.kontor_ledger_type ENUM ('credit', 'debit', 'adjust', 'refund')
 *
 *   public.tenant_kontor_balances (
 *     tenant_id uuid PK → tenants(id),
 *     balance   numeric(14,2) NOT NULL DEFAULT 0,  -- CHECK >= 0
 *     reserved  numeric(14,2) NOT NULL DEFAULT 0,  -- CHECK >= 0, reserved <= balance
 *     updated_at timestamptz
 *   )
 *
 *   public.kontor_ledger (
 *     id uuid PK,
 *     tenant_id uuid → tenants(id),
 *     entry_type kontor_ledger_type,
 *     amount numeric(14,2) NOT NULL CHECK (<> 0),
 *     balance_after numeric(14,2),
 *     reference_type text,   -- ocr_*, efatura_send, topup, payment_efatura_kontor, …
 *     reference_id uuid,
 *     description text,
 *     created_by uuid,
 *     created_at timestamptz
 *   )
 *
 * Sözleşme: credit/refund/adjust(+) pozitif; debit negatif tutar.
 * Mutasyonlar yalnızca ledger üzerinden; balance satırı ledger ile senkron tutulur.
 */

export type KontorLedgerType = 'credit' | 'debit' | 'adjust' | 'refund';

/** OCR belge türleri — her biri ayrı birim maliyet ve reference_type üretir */
export type OcrDocumentKind = 'sozlesme' | 'kimlik' | 'tapu';

/**
 * Ledger reference_type değerleri.
 *
 * Debit (kullanım): ocr_*, efatura_send
 * Credit (manuel): topup
 * Credit (ödeme fulfillment — paket cinsine göre):
 *   payment_topup           → genel topup / abonelik planı
 *   payment_efatura_kontor  → e-fatura kontör paketi (bayilik)
 *   payment_ocr_kontor      → OCR kontör paketi
 *   payment_mixed_kontor    → karma paket
 */
export type KontorReferenceType =
  | 'ocr_sozlesme'
  | 'ocr_kimlik'
  | 'ocr_tapu'
  | 'efatura_send'
  | 'topup'
  | 'payment_topup'
  | 'payment_efatura_kontor'
  | 'payment_ocr_kontor'
  | 'payment_mixed_kontor'
  | 'adjust'
  | 'refund';

/** Desteklenen e-fatura entegratörleri (Finatura bayilik — 8 iskelet) */
export type EinvoiceProviderCode =
  | 'edm'
  | 'uyumsoft'
  | 'fit'
  | 'elogo'
  | 'qnb'
  | 'nes'
  | 'nilvera'
  | 'izibiz';

export interface KontorBalance {
  tenantId: string;
  balance: number;
  reserved: number;
  /** Kullanılabilir = balance - reserved */
  available: number;
  updatedAt: Date | null;
}

export interface KontorLedgerEntry {
  id: string;
  tenantId: string;
  entryType: KontorLedgerType;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface DeductResult {
  entry: KontorLedgerEntry;
  /** true ise aynı reference daha önce düşülmüş (idempotent replay) */
  idempotentReplay: boolean;
}

export class InsufficientKontorError extends Error {
  readonly code = 'insufficient_kontor' as const;
  readonly available: number;
  readonly required: number;

  constructor(available: number, required: number) {
    super(
      `Yetersiz kontör: kullanılabilir=${available}, gereken=${required}`,
    );
    this.name = 'InsufficientKontorError';
    this.available = available;
    this.required = required;
  }
}

export class KontorValidationError extends Error {
  readonly code = 'validation_error' as const;

  constructor(message: string) {
    super(message);
    this.name = 'KontorValidationError';
  }
}

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

export {};
