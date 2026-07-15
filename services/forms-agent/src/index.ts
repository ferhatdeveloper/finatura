/** @finatura/forms-agent — Aşama 3.3 dijital maslak / yer gösterme / kapora */

export type {
  FormKind,
  FormMeta,
  FormParty,
  PdfRenderOptions,
  RenderedForm,
  TenantLetterhead,
} from "./types.js";

export type { YerGostermeFormData, YerGostermeProperty } from "./forms/yer-gosterme/types.js";
export type { AracKaporaFormData, AracKaporaVehicle } from "./forms/arac-kapora/types.js";

export { renderYerGostermeHtml } from "./forms/yer-gosterme/template.html.js";
export { renderAracKaporaHtml } from "./forms/arac-kapora/template.html.js";
export { sampleYerGosterme } from "./forms/yer-gosterme/sample.js";
export { sampleAracKapora } from "./forms/arac-kapora/sample.js";

export { renderForm, renderFormHtml } from "./pdf/renderFormPdf.js";
export type { AnyFormData } from "./pdf/renderFormPdf.js";
export { htmlToPdfStub } from "./pdf/htmlToPdf.js";
export { buildPdfKitStub, stubFromPlainLines } from "./pdf/pdfkitStub.js";
