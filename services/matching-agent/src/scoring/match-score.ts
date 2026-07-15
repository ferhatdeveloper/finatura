import {
  adaParselEquals,
  nameSimilarity,
  normalizePlate,
} from "../extractors/index.js";
import type {
  ExtractedSignals,
  MatchCandidate,
  MatchOptions,
  MatchScoreBreakdown,
  ScoreWeights,
} from "../types.js";
import { CONFIDENCE_CAP, DEFAULT_WEIGHTS } from "./weights.js";

export interface ScoreComputation {
  score: number;
  confidence: number;
  breakdown: MatchScoreBreakdown[];
}

export function scoreCandidate(
  signals: ExtractedSignals,
  candidate: MatchCandidate,
  options: MatchOptions = {},
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoreComputation {
  const breakdown: MatchScoreBreakdown[] = [];
  const nameThreshold = options.nameSimilarityThreshold ?? 0.72;

  // TCKN
  if (candidate.tckn) {
    const candTckn = candidate.tckn.replace(/\D/g, "");
    if (signals.tckns.includes(candTckn)) {
      breakdown.push({
        signal: "tckn",
        points: weights.tcknExact,
        detail: candTckn,
      });
    }
  }

  // Plaka
  if (candidate.plate) {
    const candPlate = normalizePlate(candidate.plate);
    if (signals.plates.includes(candPlate)) {
      breakdown.push({
        signal: "plate",
        points: weights.plateExact,
        detail: candPlate,
      });
    }
  }

  // Ada / Parsel
  if (candidate.ada && candidate.parsel) {
    const hit = signals.adaParsel.some((ap) =>
      adaParselEquals(ap, {
        ada: candidate.ada,
        parsel: candidate.parsel,
      }),
    );
    if (hit) {
      breakdown.push({
        signal: "ada_parsel",
        points: weights.adaParselExact,
        detail: `${candidate.ada}/${candidate.parsel}`,
      });
    }
  }

  // Müşteri adı
  if (candidate.customerName && signals.candidateNames.length > 0) {
    let best = 0;
    let bestName = "";
    for (const name of signals.candidateNames) {
      const sim = nameSimilarity(name, candidate.customerName);
      if (sim > best) {
        best = sim;
        bestName = name;
      }
    }
    if (best >= nameThreshold) {
      const points = Math.round(weights.customerNameMax * best);
      breakdown.push({
        signal: "customer_name",
        points,
        detail: `${bestName} ~ ${candidate.customerName} (${best.toFixed(2)})`,
      });
    }
  }

  // Tutar yakınlığı (banka tutarı ayrı verilir — opsiyonel bağlam)
  // Bu fonksiyon yalnız candidate.amount ile çağıran katmandan amount alır.
  // amount karşılaştırma `scoreAgainstTransaction` içinde yapılır.

  const score = breakdown.reduce((sum, b) => sum + b.points, 0);
  const confidence = Math.min(1, score / CONFIDENCE_CAP);

  return { score, confidence, breakdown };
}

export function applyAmountScore(
  bankAmount: number | undefined,
  candidateAmount: number | undefined,
  breakdown: MatchScoreBreakdown[],
  options: MatchOptions = {},
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): MatchScoreBreakdown[] {
  if (
    bankAmount === undefined ||
    candidateAmount === undefined ||
    !Number.isFinite(bankAmount) ||
    !Number.isFinite(candidateAmount)
  ) {
    return breakdown;
  }

  const tol = options.amountToleranceRatio ?? 0.02;
  const absBank = Math.abs(bankAmount);
  const absCand = Math.abs(candidateAmount);
  if (absBank === 0 && absCand === 0) {
    return [
      ...breakdown,
      { signal: "amount", points: weights.amountExact, detail: "0=0" },
    ];
  }

  const delta = Math.abs(absBank - absCand);
  const ratio = absCand === 0 ? delta : delta / absCand;

  if (ratio === 0 || delta < 0.005) {
    return [
      ...breakdown,
      {
        signal: "amount",
        points: weights.amountExact,
        detail: `${absBank}=${absCand}`,
      },
    ];
  }

  if (ratio <= tol) {
    return [
      ...breakdown,
      {
        signal: "amount",
        points: weights.amountClose,
        detail: `Δ${(ratio * 100).toFixed(2)}%`,
      },
    ];
  }

  return breakdown;
}

export function finalizeScore(
  breakdown: MatchScoreBreakdown[],
): ScoreComputation {
  const score = breakdown.reduce((sum, b) => sum + b.points, 0);
  return {
    score,
    confidence: Math.min(1, score / CONFIDENCE_CAP),
    breakdown,
  };
}
