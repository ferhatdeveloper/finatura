import { z } from 'zod';

/**
 * OCR / Document Agent sonuç tipleri.
 * Roadmap Aşama 2: Noter, Tapu, Kimlik parser’ları.
 */

export const ocrDocumentKindSchema = z.enum([
  'kimlik',
  'ehliyet',
  'noter_sozlesme',
  'tapu',
  'unknown',
]);
export type OcrDocumentKind = z.infer<typeof ocrDocumentKindSchema>;

export const ocrExtractionSourceSchema = z.enum(['regex', 'llm', 'mrz', 'manual']);
export type OcrExtractionSource = z.infer<typeof ocrExtractionSourceSchema>;

/** Alan bazlı güven skoru (0–1). */
export const fieldConfidenceMapSchema = z.record(z.number().min(0).max(1));
export type FieldConfidenceMap = z.infer<typeof fieldConfidenceMapSchema>;

// —— Kimlik / Ehliyet ——

export const kimlikBelgeTuruSchema = z.enum(['tc_kimlik', 'ehliyet', 'unknown']);
export type KimlikBelgeTuru = z.infer<typeof kimlikBelgeTuruSchema>;

export const kimlikOcrFieldsSchema = z.object({
  tckn: z.string().nullable(),
  ad: z.string().nullable(),
  soyad: z.string().nullable(),
  adSoyad: z.string().nullable(),
  /** YYYY-MM-DD */
  dogumTarihi: z.string().nullable(),
  belgeTuru: kimlikBelgeTuruSchema,
});

export type KimlikOcrFields = z.infer<typeof kimlikOcrFieldsSchema>;

export const kimlikOcrResultSchema = z.object({
  documentKind: z.literal('kimlik'),
  fields: kimlikOcrFieldsSchema,
  confidence: z.object({
    tckn: z.number().min(0).max(1),
    ad: z.number().min(0).max(1),
    soyad: z.number().min(0).max(1),
    dogumTarihi: z.number().min(0).max(1),
    belgeTuru: z.number().min(0).max(1),
  }),
  overallConfidence: z.number().min(0).max(1),
  extractedBy: z
    .record(ocrExtractionSourceSchema)
    .optional(),
  rawText: z.string().optional(),
  warnings: z.array(z.string()).default([]),
});

export type KimlikOcrResult = z.infer<typeof kimlikOcrResultSchema>;

// —— Noter satış sözleşmesi ——

export const noterOcrFieldsSchema = z.object({
  plate: z.string().nullable(),
  chassisNumber: z.string().nullable(),
  salePrice: z.number().nonnegative().nullable(),
  currencyCode: z.string().length(3).nullable(),
  buyerTckn: z.string().nullable(),
  buyerName: z.string().nullable(),
  sellerTckn: z.string().nullable(),
  sellerName: z.string().nullable(),
  /** YYYY-MM-DD */
  contractDate: z.string().nullable(),
  noterName: z.string().nullable(),
  yevmiyeNo: z.string().nullable(),
});

export type NoterOcrFields = z.infer<typeof noterOcrFieldsSchema>;

export const noterOcrResultSchema = z.object({
  documentKind: z.literal('noter_sozlesme'),
  fields: noterOcrFieldsSchema,
  confidence: fieldConfidenceMapSchema,
  overallConfidence: z.number().min(0).max(1),
  extractedBy: z.record(ocrExtractionSourceSchema).optional(),
  rawText: z.string().optional(),
  warnings: z.array(z.string()).default([]),
});

export type NoterOcrResult = z.infer<typeof noterOcrResultSchema>;

// —— Tapu senedi ——

export const tapuOcrFieldsSchema = z.object({
  city: z.string().nullable(),
  district: z.string().nullable(),
  neighborhood: z.string().nullable(),
  ada: z.string().nullable(),
  parsel: z.string().nullable(),
  /** m² */
  areaSqm: z.number().nonnegative().nullable(),
  ownerName: z.string().nullable(),
  ownerIdentity: z.string().nullable(),
  propertyType: z.string().nullable(),
  blockNumber: z.string().nullable(),
  independentSection: z.string().nullable(),
});

export type TapuOcrFields = z.infer<typeof tapuOcrFieldsSchema>;

export const tapuOcrResultSchema = z.object({
  documentKind: z.literal('tapu'),
  fields: tapuOcrFieldsSchema,
  confidence: fieldConfidenceMapSchema,
  overallConfidence: z.number().min(0).max(1),
  extractedBy: z.record(ocrExtractionSourceSchema).optional(),
  rawText: z.string().optional(),
  warnings: z.array(z.string()).default([]),
});

export type TapuOcrResult = z.infer<typeof tapuOcrResultSchema>;

/** Ayırt edici birleşik OCR sonucu. */
export const ocrResultSchema = z.discriminatedUnion('documentKind', [
  kimlikOcrResultSchema,
  noterOcrResultSchema,
  tapuOcrResultSchema,
]);

export type OcrResult = z.infer<typeof ocrResultSchema>;

/** Genel OCR işlem zarfı (Document Agent yanıtı). */
export const ocrJobResultSchema = z.object({
  jobId: z.string().optional(),
  documentKind: ocrDocumentKindSchema,
  result: ocrResultSchema.nullable(),
  processingMs: z.number().int().nonnegative().optional(),
  error: z.string().nullable().optional(),
});

export type OcrJobResult = z.infer<typeof ocrJobResultSchema>;
