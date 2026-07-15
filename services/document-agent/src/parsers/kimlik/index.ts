/**
 * AŞAMA 2.3 — Kimlik / Ehliyet OCR Parser
 * Sahiplik: services/document-agent/src/parsers/kimlik/
 */

export { parseKimlikOcr, parseKimlikOcrSync } from './parse.js';
export { extractKimlikByRegex, detectBelgeTuru } from './regex.js';
export { isValidTckn, findValidTckns } from './validate-tckn.js';
export {
  buildKimlikExtractionPrompt,
  KIMLIK_SYSTEM_PROMPT,
  KIMLIK_USER_PROMPT_TEMPLATE,
} from './prompt.js';
export type {
  FieldConfidence,
  KimlikBelgeTuru,
  KimlikOcrFields,
  KimlikParseOptions,
  KimlikParseResult,
} from './types.js';
