/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** api-gateway tabanı (varsayılan http://localhost:3000) */
  readonly VITE_API_GATEWAY_URL?: string;
  /** auto | mock | gateway — varsayılan auto */
  readonly VITE_AUTH_MODE?: string;
  /** accountant-bridge tabanı; boşsa Vite proxy `/api/accountant` */
  readonly VITE_ACCOUNTANT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
