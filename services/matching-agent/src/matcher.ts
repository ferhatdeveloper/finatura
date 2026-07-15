import { extractSignals } from "./extractors/index.js";
import {
  applyAmountScore,
  finalizeScore,
  scoreCandidate,
} from "./scoring/match-score.js";
import { DEFAULT_WEIGHTS } from "./scoring/weights.js";
import type {
  BankTransactionInput,
  ExtractedSignals,
  MatchCandidate,
  MatchOptions,
  MatchResult,
  ScoreWeights,
} from "./types.js";

export interface MatchingAgentConfig {
  weights?: Partial<ScoreWeights>;
  defaultOptions?: MatchOptions;
}

/**
 * Matching Agent — banka hareketi ↔ fatura/sözleşme eşleştirme motoru.
 *
 * Akış:
 * 1) Açıklamadan Plaka, Ada/Parsel, TCKN, müşteri adı süz
 * 2) Her aday için sinyal + tutar skoru hesapla
 * 3) minScore üstü adayları confidence ile sırala
 */
export class MatchingAgent {
  private readonly weights: ScoreWeights;
  private readonly defaultOptions: MatchOptions;

  constructor(config: MatchingAgentConfig = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...config.weights };
    this.defaultOptions = {
      minScore: 25,
      limit: 5,
      amountToleranceRatio: 0.02,
      nameSimilarityThreshold: 0.72,
      ...config.defaultOptions,
    };
  }

  extract(description: string): ExtractedSignals {
    return extractSignals(description);
  }

  matchTransaction(
    tx: BankTransactionInput,
    candidates: MatchCandidate[],
    options?: MatchOptions,
  ): MatchResult[] {
    const opts = { ...this.defaultOptions, ...options };
    const signals = extractSignals(tx.description);
    const results: MatchResult[] = [];

    for (const candidate of candidates) {
      if (candidate.status === "paid" || candidate.status === "cancelled") {
        continue;
      }

      const base = scoreCandidate(
        signals,
        candidate,
        opts,
        this.weights,
      );
      const withAmount = applyAmountScore(
        tx.amount,
        candidate.amount,
        base.breakdown,
        opts,
        this.weights,
      );
      const final = finalizeScore(withAmount);

      if (final.score < (opts.minScore ?? 25)) continue;

      results.push({
        candidateId: candidate.id,
        kind: candidate.kind,
        score: final.score,
        confidence: final.confidence,
        breakdown: final.breakdown,
        signals,
      });
    }

    results.sort((a, b) => b.score - a.score || b.confidence - a.confidence);
    return results.slice(0, opts.limit ?? 5);
  }

  /** Tek aday için skor — birim test / debug */
  scoreOne(
    description: string,
    candidate: MatchCandidate,
    amount?: number,
    options?: MatchOptions,
  ): MatchResult {
    const tx: BankTransactionInput = {
      id: "debug",
      description,
      amount: amount ?? candidate.amount ?? 0,
    };
    const [hit] = this.matchTransaction(tx, [candidate], {
      ...options,
      minScore: 0,
      limit: 1,
    });
    if (hit) return hit;

    const signals = extractSignals(description);
    return {
      candidateId: candidate.id,
      kind: candidate.kind,
      score: 0,
      confidence: 0,
      breakdown: [],
      signals,
    };
  }
}

export function createMatchingAgent(
  config?: MatchingAgentConfig,
): MatchingAgent {
  return new MatchingAgent(config);
}
