/** Ortam değişkenleri — gerçek gateway / document-agent path'leri hazır. */
export const apiConfig = {
  useMock: (import.meta.env.VITE_USE_MOCK ?? "true") !== "false",
  gatewayUrl: (
    import.meta.env.VITE_API_GATEWAY_URL ?? "http://localhost:3000"
  ).replace(/\/$/, ""),
  documentAgentUrl: (
    import.meta.env.VITE_DOCUMENT_AGENT_URL ?? "http://localhost:3100"
  ).replace(/\/$/, ""),
} as const;

/** Bilinen / planlanan endpoint path'leri (gateway + document-agent). */
export const endpoints = {
  /** POST — body: { email, password, firmaKodu } */
  login: "/auth/login",
  refresh: "/auth/refresh",
  me: "/auth/me",
  /** GET — cari + açık veresiye özeti (tenant proxy) */
  cariSummary: "/v1/tenant/caris/summary",
  /** GET — banka mutabakat (settlement) listesi */
  settlements: "/v1/tenant/settlements",
  /** GET — e-fatura taslakları */
  einvoiceDrafts: "/v1/tenant/einvoices/drafts",
  /** POST multipart — document-agent */
  documentsAnalyze: "/api/v1/documents/analyze",
  documentsAnalyzeText: "/api/v1/documents/analyze-text",
} as const;
