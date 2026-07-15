/** Banka hareketi — Matching Agent girişi */
export interface BankTransactionInput {
  id: string;
  description: string;
  amount: number;
  currency?: string;
  direction?: "in" | "out";
  bookedAt?: string;
}

/** Açıklamadan süzülen sinyaller */
export interface ExtractedSignals {
  plates: string[];
  adaParsel: AdaParselRef[];
  tckns: string[];
  candidateNames: string[];
  rawDescription: string;
  normalizedDescription: string;
}

export interface AdaParselRef {
  ada: string;
  parsel: string;
  /** "123/45" veya "Ada 123 Parsel 45" kaynak biçimi */
  raw: string;
}

/** Eşleştirilecek aday (fatura veya sözleşme) */
export interface MatchCandidate {
  id: string;
  kind: "invoice" | "contract";
  /** İlişkili cari adı / unvan */
  customerName?: string;
  tckn?: string;
  vkn?: string;
  plate?: string;
  ada?: string;
  parsel?: string;
  amount?: number;
  currency?: string;
  /** Açık / tahsil edilmemiş kayıt */
  status?: "open" | "partial" | "paid" | "cancelled";
  metadata?: Record<string, unknown>;
}

export type MatchSignal =
  | "tckn"
  | "plate"
  | "ada_parsel"
  | "customer_name"
  | "amount";

export interface MatchScoreBreakdown {
  signal: MatchSignal;
  points: number;
  detail?: string;
}

export interface MatchResult {
  candidateId: string;
  kind: MatchCandidate["kind"];
  score: number;
  /** 0–1 arası normalize güven */
  confidence: number;
  breakdown: MatchScoreBreakdown[];
  signals: ExtractedSignals;
}

export interface MatchOptions {
  /** Bu skorun altındaki adaylar elenir (varsayılan 25) */
  minScore?: number;
  /** En fazla kaç öneri döner (varsayılan 5) */
  limit?: number;
  /** Tutar yakınlığı toleransı (oran, varsayılan 0.02 = %2) */
  amountToleranceRatio?: number;
  /** İsim benzerliği eşiği 0–1 (varsayılan 0.72) */
  nameSimilarityThreshold?: number;
}

export interface ScoreWeights {
  tcknExact: number;
  plateExact: number;
  adaParselExact: number;
  customerNameMax: number;
  amountExact: number;
  amountClose: number;
}
