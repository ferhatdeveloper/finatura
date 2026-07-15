import { buildPdfKitStub } from "./pdfkitStub.js";

export interface HtmlToPdfStubResult {
  /** Gerçek PDF değil; motor bağlanana kadar iskelet */
  pdfBytes: Uint8Array;
  /** Kaynak HTML (önizleme / debug) */
  html: string;
  engine: "html-to-pdf-stub";
}

/**
 * HTML → PDF iskeleti.
 *
 * Üretimde buraya Puppeteer / Playwright / wkhtmltopdf vb. bağlanır.
 * Şimdilik HTML’i saklayıp PDFKit-benzeri stub baytları döner.
 */
export function htmlToPdfStub(html: string, title: string): HtmlToPdfStubResult {
  const plainPreview = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);

  const pdfBytes = buildPdfKitStub({
    title,
    lines: [
      "Engine: html-to-pdf-stub",
      `HTML length: ${html.length} chars`,
      "Preview excerpt:",
      plainPreview,
    ],
  });

  return { pdfBytes, html, engine: "html-to-pdf-stub" };
}
