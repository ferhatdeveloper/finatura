import { createLlmFieldExtractor, resolveLlmConfig } from './createLlmExtractor.js';
import type { LlmFieldExtractor } from './types.js';

let cached: LlmFieldExtractor | null | undefined;

/** Process boyunca tek extractor (yoksa null). */
export function getDefaultLlmFieldExtractor(): LlmFieldExtractor | null {
  if (cached === undefined) {
    cached = createLlmFieldExtractor(resolveLlmConfig());
  }
  return cached;
}

export function getLlmStatus(): {
  configured: boolean;
  enabled: boolean;
  provider: string | null;
  model: string | null;
} {
  const enabled =
    process.env.LLM_ENABLED?.trim().toLowerCase() === 'true' ||
    process.env.LLM_ENABLED?.trim() === '1';
  const cfg = resolveLlmConfig();
  return {
    configured: Boolean(cfg),
    enabled,
    provider: enabled && cfg ? cfg.provider : null,
    model: enabled && cfg ? cfg.model : null,
  };
}
