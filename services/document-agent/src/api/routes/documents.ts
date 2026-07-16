import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config.js';
import { runDocumentPipeline } from '../../orchestrator/index.js';
import type { DocumentType } from '../../orchestrator/types.js';
import { HttpError } from '../middleware/errorHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

const VALID_TYPES = new Set<DocumentType>([
  'noter',
  'tapu',
  'kimlik',
  'ehliyet',
  'unknown',
]);

function parseHint(raw: unknown): DocumentType | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const value = raw.trim().toLowerCase() as DocumentType;
  if (!VALID_TYPES.has(value)) {
    throw new HttpError(400, 'invalid_document_type', `Geçersiz documentType: ${raw}`);
  }
  return value;
}

export const documentsRouter = Router();

/**
 * POST /api/v1/documents/analyze
 *
 * multipart/form-data:
 *   - file (opsiyonel görsel/PDF)
 *   - ocrText (opsiyonel; OCR metni)
 *   - documentType (opsiyonel hint: noter|tapu|kimlik)
 *
 * application/json:
 *   { ocrText?, documentType?, filename? }
 */
documentsRouter.post('/analyze', upload.single('file'), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const hint = parseHint(body.documentType ?? body.documentTypeHint);
    const ocrText =
      typeof body.ocrText === 'string'
        ? body.ocrText
        : typeof body.text === 'string'
          ? body.text
          : undefined;

    const file = req.file;
    if (!file && !ocrText) {
      throw new HttpError(
        400,
        'missing_input',
        'file veya ocrText alanlarından en az biri gerekli',
      );
    }

    const result = await runDocumentPipeline({
      buffer: file?.buffer,
      filename: file?.originalname ?? (typeof body.filename === 'string' ? body.filename : undefined),
      mimeType: file?.mimetype,
      ocrText,
      documentTypeHint: hint,
    });

    const status =
      result.documentType === 'unknown' || result.fields === null ? 422 : 200;

    res.status(status).json({
      ok: status === 200,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Sadece gerçek OCR metni ile analiz (multipart yok).
 * Sunucu tarafında fixture / mock metin enjekte edilmez.
 */
documentsRouter.post('/analyze-text', async (req, res, next) => {
  try {
    const { ocrText, text, documentType, documentTypeHint, filename } = req.body ?? {};
    const content = typeof ocrText === 'string' ? ocrText : typeof text === 'string' ? text : null;
    if (!content || !content.trim()) {
      throw new HttpError(
        400,
        'missing_ocr_text',
        'ocrText (veya text) zorunlu — analyze-text mock fixture üretmez',
      );
    }
    if (content.includes('[OCR_STUB]')) {
      throw new HttpError(
        422,
        'stub_ocr_rejected',
        'OCR stub placeholder kabul edilmez; gerçek OCR metni veya görüntü gönderin',
      );
    }

    const result = await runDocumentPipeline({
      ocrText: content.trim(),
      filename: typeof filename === 'string' ? filename : undefined,
      documentTypeHint: parseHint(documentType ?? documentTypeHint),
    });

    const status =
      result.documentType === 'unknown' || result.fields === null ? 422 : 200;

    res.status(status).json({
      ok: status === 200,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});
