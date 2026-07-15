/**
 * PDFKit benzeri minimum stub.
 * Gerçek `pdfkit` bağımlılığı yok; ileride değiş tokuş edilebilir arayüz.
 */

export interface PdfKitStubDoc {
  title: string;
  lines: string[];
}

/** Okunabilir bir “PDF stub” bayt dizisi üretir (gerçek PDF değil). */
export function buildPdfKitStub(doc: PdfKitStubDoc): Uint8Array {
  const header = [
    "%PDF-1.4-STUB (Finatura forms-agent — PDFKit stub)",
    `% Title: ${doc.title}`,
    "% Bu çıktı üretim PDF'i değildir. html-to-pdf veya pdfkit bağlandığında değişecektir.",
    "% --- CONTENT ---",
    ...doc.lines.map((l) => `% ${l}`),
    "% --- END ---",
    "%%EOF",
  ].join("\n");

  return new TextEncoder().encode(header);
}

/** Düz metin satırlarından stub doküman. */
export function stubFromPlainLines(title: string, lines: string[]): Uint8Array {
  return buildPdfKitStub({ title, lines });
}
