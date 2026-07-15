import 'dotenv/config';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`${name} geçerli bir sayı olmalı, gelen: ${raw}`);
  }
  return n;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function parseExtraQuery(raw: string): Record<string, string> {
  if (!raw.trim()) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split('&')) {
    const [k, ...rest] = part.split('=');
    if (!k) continue;
    out[decodeURIComponent(k.trim())] = decodeURIComponent(rest.join('=').trim());
  }
  return out;
}

export type FinteoClientMode = 'mock' | 'http';
export type MatchingBridgeMode = 'inprocess' | 'http' | 'off';

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  centralDatabaseUrl: process.env.CENTRAL_DATABASE_URL ?? '',
  pollIntervalMs: intEnv('POLL_INTERVAL_MS', 600_000),
  pollRunOnStart: boolEnv('POLL_RUN_ON_START', true),
  finteo: {
    apiBaseUrl: process.env.FINTEO_API_BASE_URL ?? 'https://api.finteo.example/v1',
    apiKey: process.env.FINTEO_API_KEY ?? '',
    clientMode: (process.env.FINTEO_CLIENT_MODE ?? 'mock') as FinteoClientMode,
    /** Hesap bazlı hareket path şablonu — {accountRef} yer tutuculu. */
    transactionsPath:
      process.env.FINTEO_TRANSACTIONS_PATH ?? '/accounts/{accountRef}/transactions',
    /** Hesap listesi yokken kullanılan genel endpoint. */
    transactionsListPath:
      process.env.FINTEO_TRANSACTIONS_LIST_PATH ?? '/transactions',
    sinceQueryParam: process.env.FINTEO_SINCE_QUERY_PARAM ?? 'since',
    authHeader: process.env.FINTEO_AUTH_HEADER ?? 'Authorization',
    /** Boş string = anahtarı header'a olduğu gibi yaz. */
    authScheme: process.env.FINTEO_AUTH_SCHEME ?? 'Bearer',
    timeoutMs: intEnv('FINTEO_TIMEOUT_MS', 30_000),
    extraQuery: parseExtraQuery(process.env.FINTEO_EXTRA_QUERY ?? ''),
  },
  matching: {
    /**
     * Sync sonrası unmatched hareketler için matching-agent.
     * off | inprocess (paket import) | http (uzak servis).
     */
    mode: (process.env.MATCHING_BRIDGE_MODE ?? 'inprocess') as MatchingBridgeMode,
    httpBaseUrl: process.env.MATCHING_AGENT_URL ?? '',
    httpTimeoutMs: intEnv('MATCHING_HTTP_TIMEOUT_MS', 15_000),
    minScore: intEnv('MATCHING_MIN_SCORE', 25),
    limit: intEnv('MATCHING_LIMIT', 5),
  },
  pool: {
    max: intEnv('POOL_MAX', 5),
    idleTimeoutMs: intEnv('POOL_IDLE_TIMEOUT_MS', 30_000),
  },
  /** Boşsa tüm aktif tenant'lar; doluysa yalnızca listedekiler. */
  tenantIdsFilter: (process.env.TENANT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

export function assertConfig(): void {
  if (!config.centralDatabaseUrl) {
    throw new Error('Eksik ortam değişkeni: CENTRAL_DATABASE_URL');
  }
  if (config.pollIntervalMs < 1_000) {
    throw new Error('POLL_INTERVAL_MS en az 1000 olmalı');
  }
  if (config.finteo.clientMode !== 'mock' && config.finteo.clientMode !== 'http') {
    throw new Error('FINTEO_CLIENT_MODE yalnızca "mock" veya "http" olabilir');
  }
  if (config.finteo.clientMode === 'http' && !config.finteo.apiKey) {
    throw new Error('FINTEO_CLIENT_MODE=http iken FINTEO_API_KEY zorunlu');
  }
  const mm = config.matching.mode;
  if (mm !== 'off' && mm !== 'inprocess' && mm !== 'http') {
    throw new Error('MATCHING_BRIDGE_MODE yalnızca "off", "inprocess" veya "http" olabilir');
  }
  if (mm === 'http' && !config.matching.httpBaseUrl) {
    throw new Error('MATCHING_BRIDGE_MODE=http iken MATCHING_AGENT_URL zorunlu');
  }
}
