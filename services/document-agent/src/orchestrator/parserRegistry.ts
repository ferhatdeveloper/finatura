import { kimlikAdapter, noterAdapter, tapuAdapter } from './adapters/index.js';
import type { DocumentType, ParserAdapter } from './types.js';

const registry = new Map<DocumentType, ParserAdapter>([
  ['noter', noterAdapter],
  ['tapu', tapuAdapter],
  ['kimlik', kimlikAdapter],
]);

export function getParser(documentType: DocumentType): ParserAdapter | undefined {
  if (documentType === 'unknown') return undefined;
  return registry.get(documentType);
}

export function listRegisteredParsers(): DocumentType[] {
  return [...registry.keys()];
}
