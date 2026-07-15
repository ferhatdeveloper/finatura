/**
 * AŞAMA 2.1 — Noter Satış Sözleşmesi OCR Parser
 * Sahiplik: services/document-agent/src/parsers/noter/
 */

export { parseNoterOcr, parseNoterOcrSync } from './parse.js';
export {
  extractNoterByRegex,
  detectBelgeTuru,
  normalizePlaka,
  normalizeSase,
  parseTurkishMoney,
} from './regex.js';
export { isValidTckn, findValidTckns } from './validate-tckn.js';
export {
  buildNoterExtractionPrompt,
  NOTER_SYSTEM_PROMPT,
  NOTER_USER_PROMPT_TEMPLATE,
} from './prompt.js';
export type {
  NoterBelgeTuru,
  NoterFieldConfidence,
  NoterOcrFields,
  NoterParseOptions,
  NoterParseResult,
} from './types.js';
