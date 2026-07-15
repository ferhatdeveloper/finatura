import type { MatchResult } from '@finatura/matching-agent';

/** raw_payload.finatura_match altına yazılan öneri paketi. */
export interface FinaturaMatchPayload {
  scoredAt: string;
  bridge: 'inprocess' | 'http';
  suggestions: Array<{
    candidateId: string;
    kind: MatchResult['kind'];
    score: number;
    confidence: number;
    breakdown: MatchResult['breakdown'];
  }>;
  signals: MatchResult['signals'] | null;
}

export interface MatchTenantResult {
  tenantId: string;
  scanned: number;
  scored: number;
  withSuggestions: number;
  errors: string[];
}
