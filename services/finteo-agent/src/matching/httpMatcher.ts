import type {
  BankTransactionInput,
  MatchCandidate,
  MatchOptions,
  MatchResult,
} from '@finatura/matching-agent';
import { config } from '../config.js';

/**
 * Uzak matching-agent HTTP köprüsü.
 * Beklenen sözleşme (env ile base URL):
 *   POST {base}/match
 *   body: { transaction, candidates, options }
 *   response: { results: MatchResult[] } | MatchResult[]
 */
export async function matchViaHttp(
  transaction: BankTransactionInput,
  candidates: MatchCandidate[],
  options: MatchOptions,
): Promise<MatchResult[]> {
  const base = config.matching.httpBaseUrl.replace(/\/+$/, '');
  const url = `${base}/match`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.matching.httpTimeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction, candidates, options }),
      signal: controller.signal,
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new Error(`matching-agent HTTP JSON parse hatası (${res.status})`);
      }
    }

    if (!res.ok) {
      throw new Error(
        `matching-agent HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }

    if (Array.isArray(body)) return body as MatchResult[];
    if (body && typeof body === 'object') {
      const obj = body as Record<string, unknown>;
      if (Array.isArray(obj.results)) return obj.results as MatchResult[];
      if (Array.isArray(obj.suggestions)) return obj.suggestions as MatchResult[];
    }
    return [];
  } finally {
    clearTimeout(timer);
  }
}
