import {
  createMatchingAgent,
  type BankTransactionInput,
  type MatchCandidate,
  type MatchOptions,
  type MatchResult,
} from '@finatura/matching-agent';
import type { Pool } from 'pg';
import { config } from '../config.js';
import type { TenantConnectionInfo } from '../types.js';
import { loadMatchCandidates } from './candidates.js';
import { matchViaHttp } from './httpMatcher.js';
import { persistMatchSuggestions } from './persistSuggestions.js';
import type { FinaturaMatchPayload, MatchTenantResult } from './types.js';
import { loadUnmatchedTransactions } from './unmatched.js';

function toPayload(
  results: MatchResult[],
  bridge: FinaturaMatchPayload['bridge'],
): FinaturaMatchPayload {
  return {
    scoredAt: new Date().toISOString(),
    bridge,
    suggestions: results.map((r) => ({
      candidateId: r.candidateId,
      kind: r.kind,
      score: r.score,
      confidence: r.confidence,
      breakdown: r.breakdown,
    })),
    signals: results[0]?.signals ?? null,
  };
}

async function scoreTransaction(
  tx: BankTransactionInput,
  candidates: MatchCandidate[],
  options: MatchOptions,
): Promise<{ bridge: FinaturaMatchPayload['bridge']; results: MatchResult[] }> {
  if (config.matching.mode === 'http') {
    const results = await matchViaHttp(tx, candidates, options);
    return { bridge: 'http', results };
  }

  const agent = createMatchingAgent({ defaultOptions: options });
  const results = agent.matchTransaction(tx, candidates, options);
  return { bridge: 'inprocess', results };
}

/**
 * Sync sonrası: unmatched bank_transactions için matching-agent çalıştırır,
 * skorları raw_payload.finatura_match'e yazar.
 */
export async function runMatchingForTenant(
  pool: Pool,
  tenant: TenantConnectionInfo,
): Promise<MatchTenantResult> {
  const result: MatchTenantResult = {
    tenantId: tenant.tenantId,
    scanned: 0,
    scored: 0,
    withSuggestions: 0,
    errors: [],
  };

  if (config.matching.mode === 'off') {
    return result;
  }

  try {
    const [transactions, candidates] = await Promise.all([
      loadUnmatchedTransactions(pool),
      loadMatchCandidates(pool),
    ]);
    result.scanned = transactions.length;

    if (transactions.length === 0) return result;

    const options: MatchOptions = {
      minScore: config.matching.minScore,
      limit: config.matching.limit,
    };

    for (const tx of transactions) {
      try {
        const { bridge, results } = await scoreTransaction(tx, candidates, options);
        await persistMatchSuggestions(pool, tx.id, toPayload(results, bridge));
        result.scored += 1;
        if (results.length > 0) result.withSuggestions += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`tx=${tx.id}: ${message}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
  }

  return result;
}
