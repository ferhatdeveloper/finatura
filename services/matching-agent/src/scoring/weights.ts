import type { ScoreWeights } from "../types.js";

/**
 * Varsayılan ağırlıklar — toplam teorik tavan ~100+ bonus.
 * TCKN > Plaka/Ada-Parsel > İsim > Tutar yakınlığı
 */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  tcknExact: 45,
  plateExact: 35,
  adaParselExact: 35,
  customerNameMax: 25,
  amountExact: 15,
  amountClose: 8,
};

/** Normalize güven için üst sınır (birden fazla sinyal üst üste binebilir) */
export const CONFIDENCE_CAP = 100;
