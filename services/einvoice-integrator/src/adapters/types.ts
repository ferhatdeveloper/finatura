import type { IntegratorProvider } from '../config.js';

/** Tenant `invoices.kind` ile uyumlu belge türleri */
export type InvoiceKind = 'efatura' | 'earsiv' | 'gider_pusulasi';

/** Entegratördeki yaşam döngüsü (tenant `invoice_status` ile hizalı) */
export type IntegratorInvoiceStatus =
  | 'queued'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'pending';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitCode?: string;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  lineTotal: number;
}

/**
 * Entegratöre gönderilecek taslak.
 * UBL/XML üretimi Aşama 3.1 transformer katmanından gelir; burada opsiyonel taşınır.
 */
export interface InvoiceDraftPayload {
  /** Yerel Finatura invoices.id (izleme için) */
  localInvoiceId?: string;
  ettn?: string;
  documentNumber?: string;
  kind: InvoiceKind;
  issueDate: string;
  senderVkn: string;
  receiverVknOrTckn: string;
  receiverTitle: string;
  currencyCode?: string;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  vatRate?: number;
  /** Hazır UBL-TR XML (transformer çıktısı) */
  ublXml?: string;
  lines?: InvoiceLine[];
  metadata?: Record<string, unknown>;
}

export interface ApproveOptions {
  /** true = kabul, false = red */
  accept?: boolean;
  reason?: string;
}

export interface SendResult {
  success: boolean;
  provider: IntegratorProvider;
  stub: boolean;
  ettn: string;
  documentNumber?: string;
  providerRef?: string;
  status: IntegratorInvoiceStatus;
  raw?: unknown;
  errorMessage?: string;
}

export interface ApproveResult {
  success: boolean;
  provider: IntegratorProvider;
  stub: boolean;
  ettn: string;
  status: IntegratorInvoiceStatus;
  raw?: unknown;
  errorMessage?: string;
}

export interface PdfDownloadResult {
  success: boolean;
  provider: IntegratorProvider;
  stub: boolean;
  ettn: string;
  contentType: 'application/pdf';
  /** Stub veya gerçek PDF içeriği (base64) */
  base64?: string;
  /** Entegratörün geçici indirme URL'si varsa */
  url?: string;
  fileName?: string;
  raw?: unknown;
  errorMessage?: string;
}

export interface StatusResult {
  success: boolean;
  provider: IntegratorProvider;
  stub: boolean;
  ettn: string;
  status: IntegratorInvoiceStatus;
  raw?: unknown;
  errorMessage?: string;
}

/**
 * Ortak entegratör sözleşmesi.
 * EDM / Uyumsoft / FIT / eLogo / QNB / NES / Nilvera / İzibiz adapter'ları bu arayüzü uygular.
 */
export interface EinvoiceIntegrator {
  readonly provider: IntegratorProvider;

  /** Taslağı entegratöre iletir (UBL gönderim) */
  sendInvoice(payload: InvoiceDraftPayload): Promise<SendResult>;

  /** Gelen kutusu / uygulama yanıtı onayı (ticari fatura senaryosu) */
  approveInvoice(ettn: string, options?: ApproveOptions): Promise<ApproveResult>;

  /** Resmi PDF indir */
  downloadPdf(ettn: string): Promise<PdfDownloadResult>;

  /** Opsiyonel durum sorgusu */
  getStatus(ettn: string): Promise<StatusResult>;
}
