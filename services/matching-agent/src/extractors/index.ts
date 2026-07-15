import type { ExtractedSignals } from "../types.js";
import { extractAdaParsel } from "./ada-parsel.js";
import { extractCandidateNames } from "./customer-name.js";
import { normalizeText } from "./normalize.js";
import { extractPlates } from "./plaka.js";
import { extractTckns } from "./tckn.js";

export { extractAdaParsel, adaParselEquals, normalizeAdaParsel } from "./ada-parsel.js";
export {
  extractCandidateNames,
  nameSimilarity,
} from "./customer-name.js";
export { normalizeText, collapseSpaces } from "./normalize.js";
export { extractPlates, normalizePlate } from "./plaka.js";
export { extractTckns, isValidTckn } from "./tckn.js";

/** Banka dekont açıklamasından tüm sinyalleri süz */
export function extractSignals(description: string): ExtractedSignals {
  const rawDescription = description ?? "";
  const normalizedDescription = normalizeText(rawDescription);

  return {
    plates: extractPlates(rawDescription),
    adaParsel: extractAdaParsel(rawDescription),
    tckns: extractTckns(rawDescription),
    candidateNames: extractCandidateNames(rawDescription),
    rawDescription,
    normalizedDescription,
  };
}
