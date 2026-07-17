/** Ortam değişkenleri — varsayılan canlı gateway / document-agent. */
export const apiConfig = {
  /** Mock yalnızca VITE_USE_MOCK=true ile açılır. */
  useMock: import.meta.env.VITE_USE_MOCK === "true",
  gatewayUrl: (
    import.meta.env.VITE_API_GATEWAY_URL ?? "http://localhost:3000"
  ).replace(/\/$/, ""),
  documentAgentUrl: (
    import.meta.env.VITE_DOCUMENT_AGENT_URL ?? "http://localhost:3100"
  ).replace(/\/$/, ""),
} as const;

/** Bilinen endpoint path'leri (gateway + document-agent). */
export const endpoints = {
  /** POST — body: { email, password, firmaKodu } */
  login: "/auth/login",
  refresh: "/auth/refresh",
  me: "/auth/me",
  /** GET — cari + açık veresiye özeti (tenant proxy) */
  cariSummary: "/v1/tenant/caris/summary",
  /** GET — cari seçenekleri */
  caris: "/v1/tenant/caris",
  /** POST — elden tahsilat/tediye */
  manualCariMovement: "/v1/tenant/veresiye-transactions/manual",
  /** GET — banka hareketleri (mutabakat listesi) */
  bankTransactions: "/v1/tenant/bank-transactions",
  /** GET — e-fatura / fatura taslakları */
  invoices: "/v1/tenant/invoices",
  /** Superadmin sistem ayarları */
  adminSettings: "/v1/admin/settings",
  /** Superadmin tenant + kontör */
  adminTenants: "/v1/admin/tenants",
  /** Raporlar */
  reportsOverview: "/v1/tenant/reports/overview",
  reportsInvoices: "/v1/tenant/reports/invoices",
  reportsBank: "/v1/tenant/reports/bank-reconciliation",
  reportsVeresiye: "/v1/tenant/reports/veresiye-aging",
  reportsKdv: "/v1/tenant/reports/kdv",
  /** POST multipart — document-agent */
  documentsAnalyze: "/api/v1/documents/analyze",
  documentsAnalyzeText: "/api/v1/documents/analyze-text",
} as const;
