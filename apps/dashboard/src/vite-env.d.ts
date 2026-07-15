/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_API_GATEWAY_URL?: string;
  readonly VITE_DOCUMENT_AGENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
