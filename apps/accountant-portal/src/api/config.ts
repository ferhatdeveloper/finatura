export const apiConfig = {
  gatewayUrl: (
    import.meta.env.VITE_API_GATEWAY_URL ?? "http://localhost:3000"
  ).replace(/\/$/, ""),
  /** gateway (varsayılan) | mock | auto */
  authMode: String(import.meta.env.VITE_AUTH_MODE ?? "gateway").toLowerCase() as
    | "gateway"
    | "mock"
    | "auto",
} as const;

export const endpoints = {
  login: "/auth/login",
  refresh: "/auth/refresh",
  me: "/auth/me",
  bankTransactions: "/v1/tenant/bank-transactions",
  invoices: "/v1/tenant/invoices",
  settlements: "/v1/tenant/settlements",
} as const;
