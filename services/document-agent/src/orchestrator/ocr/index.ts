export type {
  OcrProvider,
  OcrProviderName,
  OcrRecognizeInput,
  OcrRecognizeResult,
} from './types.js';
export { StubOcrProvider, buildStubPlaceholder } from './stubOcrProvider.js';
export { TesseractOcrProvider, OcrInputError } from './tesseractOcrProvider.js';
export { createOcrProvider, parseOcrProviderName } from './createOcrProvider.js';
export {
  getDefaultOcrProvider,
  resetDefaultOcrProvider,
} from './defaultProvider.js';
