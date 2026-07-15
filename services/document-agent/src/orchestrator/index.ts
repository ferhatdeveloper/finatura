import { getDefaultOcrProvider } from './ocr/defaultProvider.js';
import { resolveDocumentType } from './detectDocumentType.js';
import { getParser } from './parserRegistry.js';
import type { DocumentInput, OrchestrationResult } from './types.js';

/**
 * Ana akış: upload → OCR sağlayıcı → belge tipi → ilgili parser.
 */
export async function runDocumentPipeline(
  input: DocumentInput,
): Promise<OrchestrationResult> {
  const started = Date.now();
  const warnings: string[] = [];

  const ocrProvider = getDefaultOcrProvider();
  const ocr = await ocrProvider.recognize(input);
  const ocrText = ocr.text;

  if (ocr.stubbed) {
    warnings.push('ocr_stub_used');
  }

  const detection = resolveDocumentType(ocrText, input.documentTypeHint);
  const documentType = detection.documentType;

  const baseMeta = {
    filename: input.filename,
    mimeType: input.mimeType,
    pipelineMs: Date.now() - started,
    ocrProvider: ocr.provider,
  };

  if (documentType === 'unknown') {
    return {
      documentType,
      detection,
      fields: null,
      overallConfidence: 0,
      warnings: [...warnings, 'document_type_unknown'],
      ocrText,
      parser: 'none',
      meta: { ...baseMeta, pipelineMs: Date.now() - started },
    };
  }

  const parser = getParser(documentType);
  if (!parser) {
    return {
      documentType,
      detection,
      fields: null,
      overallConfidence: detection.confidence,
      warnings: [...warnings, `no_parser_registered:${documentType}`],
      ocrText,
      parser: 'none',
      meta: { ...baseMeta, pipelineMs: Date.now() - started },
    };
  }

  try {
    const parsed = await parser.parse({ ...input, ocrText });
    return {
      documentType,
      detection,
      fields: parsed.fields,
      overallConfidence: parsed.overallConfidence,
      warnings: [...warnings, ...parsed.warnings],
      ocrText,
      parser: documentType,
      meta: { ...baseMeta, pipelineMs: Date.now() - started },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(message);
    return {
      documentType,
      detection,
      fields: null,
      overallConfidence: 0,
      warnings,
      ocrText,
      parser: documentType,
      meta: { ...baseMeta, pipelineMs: Date.now() - started },
    };
  }
}
