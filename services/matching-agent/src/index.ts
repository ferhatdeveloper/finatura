export {
  extractAdaParsel,
  adaParselEquals,
  extractCandidateNames,
  extractPlates,
  extractSignals,
  extractTckns,
  isValidTckn,
  nameSimilarity,
  normalizePlate,
  normalizeText,
} from "./extractors/index.js";

export { MatchingAgent, createMatchingAgent } from "./matcher.js";
export type { MatchingAgentConfig } from "./matcher.js";

export {
  applyAmountScore,
  finalizeScore,
  scoreCandidate,
} from "./scoring/match-score.js";
export type { ScoreComputation } from "./scoring/match-score.js";

export { CONFIDENCE_CAP, DEFAULT_WEIGHTS } from "./scoring/weights.js";

export type {
  AdaParselRef,
  BankTransactionInput,
  ExtractedSignals,
  MatchCandidate,
  MatchOptions,
  MatchResult,
  MatchScoreBreakdown,
  MatchSignal,
  ScoreWeights,
} from "./types.js";
