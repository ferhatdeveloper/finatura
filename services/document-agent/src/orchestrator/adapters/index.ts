import type { DocumentInput, DocumentType, ParserAdapter } from '../types.js';

/**
 * Parser modülleri başka ajanlara ait (`src/parsers/*`).
 * Dinamik import ile derleme zamanı bağımlılığı kurulmaz;
 * klasör henüz yoksa anlamlı hata döner.
 */
async function loadParserModule(folder: string): Promise<Record<string, unknown>> {
  const relative = `../../parsers/${folder}/index.js`;
  try {
    const href = new URL(relative, import.meta.url).href;
    return (await import(href)) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`parser_not_available:${folder} — ${message}`);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

function pickConfidence(result: Record<string, unknown>): number {
  if (typeof result.overallConfidence === 'number') return result.overallConfidence;
  if (typeof result.confidence === 'number') return result.confidence;
  return 0;
}

function pickWarnings(result: Record<string, unknown>): string[] {
  if (Array.isArray(result.warnings)) {
    return result.warnings.filter((w): w is string => typeof w === 'string');
  }
  return [];
}

function pickFields(result: Record<string, unknown>): Record<string, unknown> {
  if (result.fields && typeof result.fields === 'object') {
    return asObject(result.fields);
  }
  return asObject(result);
}

function createLazyAdapter(
  type: Exclude<DocumentType, 'unknown'>,
  exportCandidates: string[],
): ParserAdapter {
  return {
    type,
    async parse(input: DocumentInput & { ocrText: string }) {
      const mod = await loadParserModule(type);
      let fn: ((text: string, options?: unknown) => Promise<unknown>) | undefined;

      for (const name of exportCandidates) {
        const candidate = mod[name];
        if (typeof candidate === 'function') {
          fn = candidate as (text: string, options?: unknown) => Promise<unknown>;
          break;
        }
      }

      if (!fn && typeof mod.default === 'function') {
        fn = mod.default as (text: string, options?: unknown) => Promise<unknown>;
      }

      if (!fn) {
        throw new Error(
          `parser_export_missing:${type} — beklenen: ${exportCandidates.join(', ')}`,
        );
      }

      const raw = await fn(input.ocrText, {});
      const result = asObject(raw);

      return {
        fields: pickFields(result),
        overallConfidence: pickConfidence(result),
        warnings: pickWarnings(result),
      };
    },
  };
}

export const kimlikAdapter = createLazyAdapter('kimlik', [
  'parseKimlikOcr',
  'parseKimlik',
  'parse',
]);

export const noterAdapter = createLazyAdapter('noter', [
  'parseNoterOcr',
  'parseNoter',
  'parse',
]);

export const tapuAdapter = createLazyAdapter('tapu', [
  'parseTapuOcr',
  'parseTapu',
  'parse',
]);
