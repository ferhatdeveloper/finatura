import { renderAracKaporaHtml } from "../forms/arac-kapora/template.html.js";
import type { AracKaporaFormData } from "../forms/arac-kapora/types.js";
import { renderYerGostermeHtml } from "../forms/yer-gosterme/template.html.js";
import type { YerGostermeFormData } from "../forms/yer-gosterme/types.js";
import type { FormKind, PdfRenderOptions, RenderedForm } from "../types.js";
import { htmlToPdfStub } from "./htmlToPdf.js";
import { stubFromPlainLines } from "./pdfkitStub.js";

export type AnyFormData = YerGostermeFormData | AracKaporaFormData;

function assertKindData(kind: FormKind, data: AnyFormData): void {
  const hasProperty = "property" in data;
  const hasVehicle = "vehicle" in data;
  if (kind === "yer_gosterme" && !hasProperty) {
    throw new Error("yer_gosterme için YerGostermeFormData bekleniyor");
  }
  if (kind === "arac_kapora" && !hasVehicle) {
    throw new Error("arac_kapora için AracKaporaFormData bekleniyor");
  }
}

export function renderFormHtml(kind: FormKind, data: AnyFormData): string {
  assertKindData(kind, data);
  if (kind === "yer_gosterme") {
    return renderYerGostermeHtml(data as YerGostermeFormData);
  }
  return renderAracKaporaHtml(data as AracKaporaFormData);
}

function fileBase(kind: FormKind, data: AnyFormData): string {
  const safe = data.meta.documentNo.replace(/[^a-zA-Z0-9-_]/g, "_");
  return kind === "yer_gosterme" ? `yer-gosterme-${safe}` : `arac-kapora-${safe}`;
}

/**
 * Formu seçilen motorla üretir.
 * Varsayılan: dolu HTML (tarayıcıda yazdır / PDF).
 */
export function renderForm(
  kind: FormKind,
  data: AnyFormData,
  options: PdfRenderOptions = {},
): RenderedForm {
  const engine = options.engine ?? "html";
  const html = renderFormHtml(kind, data);
  const title =
    options.title ??
    (kind === "yer_gosterme" ? "Yer Gösterme Belgesi" : "Araç Kapora Formu");
  const base = fileBase(kind, data);

  if (engine === "html") {
    return {
      kind,
      mimeType: "text/html",
      body: html,
      fileName: `${base}.html`,
    };
  }

  if (engine === "pdfkit-stub") {
    const lines = [
      `Belge: ${title}`,
      `No: ${data.meta.documentNo}`,
      `Tarih: ${data.meta.issuedAt}`,
      `Firma: ${data.letterhead.companyName}`,
      kind === "yer_gosterme"
        ? `Taşınmaz: ${(data as YerGostermeFormData).property.locationText}`
        : `Araç: ${(data as AracKaporaFormData).vehicle.brand} ${(data as AracKaporaFormData).vehicle.model}`,
    ];
    return {
      kind,
      mimeType: "application/pdf",
      body: stubFromPlainLines(title, lines),
      fileName: `${base}.pdf`,
    };
  }

  // html-to-pdf-stub
  const { pdfBytes } = htmlToPdfStub(html, title);
  return {
    kind,
    mimeType: "application/pdf",
    body: pdfBytes,
    fileName: `${base}.pdf`,
  };
}
