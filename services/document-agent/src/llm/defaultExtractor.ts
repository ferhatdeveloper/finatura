import {
  createLlmFieldExtractor,
  mergeLlmConfig,
  resolveLlmConfig,
} from './createLlmExtractor.js';
import type { LlmConfig, LlmFieldExtractor } from './types.js';

let cached: LlmFieldExtractor | null | undefined;
let cachedAt = 0;
let cachedCfg: LlmConfig | null = null;
const CACHE_MS = 60_000;

async function fetchRemoteLlmConfig(): Promise<{
  enabled?: boolean;
  provider?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  httpReferer?: string;
  appTitle?: string;
} | null> {
  const base = process.env.LLM_SETTINGS_URL?.trim().replace(/\/$/, '');
  if (!base) return null;
  const token = process.env.INTERNAL_SERVICE_TOKEN?.trim();
  if (!token) return null;

  try {
    const res = await fetch(`${base}/v1/admin/llm-config`, {
      headers: { 'X-Internal-Token': token },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      enabled?: boolean;
      provider?: string;
      baseUrl?: string;
      model?: string;
      apiKey?: string;
      httpReferer?: string;
      appTitle?: string;
    };
  } catch {
    return null;
  }
}

async function resolveEffectiveConfig(): Promise<{
  cfg: LlmConfig | null;
  enabled: boolean;
}> {
  const envCfg = resolveLlmConfig();
  if (envCfg) {
    const enabled =
      process.env.LLM_ENABLED?.trim().toLowerCase() === 'true' ||
      process.env.LLM_ENABLED?.trim() === '1';
    return { cfg: envCfg, enabled };
  }

  const remote = await fetchRemoteLlmConfig();
  const cfg = mergeLlmConfig(remote);
  const enabled = Boolean(remote?.enabled && cfg);
  return { cfg, enabled };
}

/** Process cache + 60 sn TTL; env veya gateway admin ayarı. */
export function getDefaultLlmFieldExtractor(): LlmFieldExtractor | null {
  const now = Date.now();
  if (cached !== undefined && now - cachedAt < CACHE_MS) {
    return cached;
  }

  // Senkron yol: önce env
  const envCfg = resolveLlmConfig();
  if (envCfg) {
    cached = createLlmFieldExtractor(envCfg);
    cachedCfg = envCfg;
    cachedAt = now;
    // Arka planda remote yenile (env yoksa sonraki çağrı için)
    void refreshFromRemote();
    return cached;
  }

  // Env yok — senkron null; arka planda remote yükle
  void refreshFromRemote();
  if (cached !== undefined) return cached;
  cached = null;
  cachedAt = now;
  return null;
}

async function refreshFromRemote(): Promise<void> {
  try {
    const { cfg, enabled } = await resolveEffectiveConfig();
    cached = createLlmFieldExtractor(cfg, enabled);
    cachedCfg = cfg;
    cachedAt = Date.now();
  } catch {
    // sessiz
  }
}

/** Cache’i temizle (ayar kaydı sonrası). */
export function clearLlmExtractorCache(): void {
  cached = undefined;
  cachedAt = 0;
  cachedCfg = null;
}

export function getLlmStatus(): {
  configured: boolean;
  enabled: boolean;
  provider: string | null;
  model: string | null;
} {
  const enabled =
    process.env.LLM_ENABLED?.trim().toLowerCase() === 'true' ||
    process.env.LLM_ENABLED?.trim() === '1' ||
    Boolean(cached && cachedCfg);
  const cfg = cachedCfg ?? resolveLlmConfig();
  return {
    configured: Boolean(cfg),
    enabled: enabled && Boolean(cfg),
    provider: enabled && cfg ? cfg.provider : null,
    model: enabled && cfg ? cfg.model : null,
  };
}
