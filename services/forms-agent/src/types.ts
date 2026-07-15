/** Desteklenen dijital maslak / saha formu türleri (Aşama 3.3). */
export type FormKind = "yer_gosterme" | "arac_kapora";

export interface FormParty {
  /** Ad Soyad veya unvan */
  fullName: string;
  tcknOrVkn?: string;
  phone?: string;
  address?: string;
}

export interface TenantLetterhead {
  companyName: string;
  tradeName?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxOffice?: string;
  taxNumber?: string;
  logoDataUrl?: string;
}

export interface FormMeta {
  documentNo: string;
  issuedAt: string; // ISO date (YYYY-MM-DD) veya datetime
  place?: string;
  notes?: string;
}

export interface PdfRenderOptions {
  /**
   * `html` → dolu HTML üretir (varsayılan).
   * `pdfkit-stub` → PDFKit benzeri bayt iskeleti (gerçek PDF değil).
   * `html-to-pdf-stub` → HTML üretip PDF stub baytlarına sarar.
   */
  engine?: "html" | "pdfkit-stub" | "html-to-pdf-stub";
  title?: string;
}

export interface RenderedForm {
  kind: FormKind;
  mimeType: "text/html" | "application/pdf";
  /** HTML içeriği veya PDF stub baytları */
  body: string | Uint8Array;
  fileName: string;
}
