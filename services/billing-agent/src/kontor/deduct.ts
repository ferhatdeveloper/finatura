import {
  KontorValidationError,
  type DeductResult,
  type OcrDocumentKind,
} from '../types.js';
import { efaturaSendCost, ocrCost, ocrReferenceType } from './costs.js';
import { kontorLedger } from './ledger.js';

const OCR_KINDS = new Set<OcrDocumentKind>(['sozlesme', 'kimlik', 'tapu']);

function assertUuidLike(value: string, field: string): void {
  // Esnek: UUID veya uygulama-üretilmiş id (min uzunluk)
  if (!value || value.trim().length < 8) {
    throw new KontorValidationError(`${field} geçerli bir referans kimliği olmalı`);
  }
}

/**
 * OCR sorgusu kontör düşümü.
 * Document Agent her başarılı OCR parse sonrası bunu çağırır.
 */
export async function deductForOcr(params: {
  tenantId: string;
  documentKind: OcrDocumentKind;
  /** OCR iş / belge kimliği — idempotency anahtarı */
  jobId: string;
  createdBy?: string | null;
  description?: string;
}): Promise<DeductResult> {
  const { tenantId, documentKind, jobId, createdBy, description } = params;

  if (!tenantId?.trim()) {
    throw new KontorValidationError('tenantId zorunlu');
  }
  if (!OCR_KINDS.has(documentKind)) {
    throw new KontorValidationError(
      'documentKind sozlesme | kimlik | tapu olmalı',
    );
  }
  assertUuidLike(jobId, 'jobId');

  const amount = ocrCost(documentKind);
  const referenceType = ocrReferenceType(documentKind);

  const result = await kontorLedger.debit({
    tenantId,
    amount,
    referenceType,
    referenceId: jobId,
    description:
      description ??
      `OCR ${documentKind} sorgusu (−${amount} kontör)`,
    createdBy: createdBy ?? null,
  });

  return {
    entry: result.entry,
    idempotentReplay: result.idempotentReplay,
  };
}

/**
 * Başarılı e-fatura gönderiminde kontör düşümü.
 * Entegratör 2xx / kabul döndükten sonra çağrılmalı.
 */
export async function deductForEfaturaSend(params: {
  tenantId: string;
  /** Tenant invoices.id veya entegratör işlem id */
  invoiceId: string;
  createdBy?: string | null;
  description?: string;
}): Promise<DeductResult> {
  const { tenantId, invoiceId, createdBy, description } = params;

  if (!tenantId?.trim()) {
    throw new KontorValidationError('tenantId zorunlu');
  }
  assertUuidLike(invoiceId, 'invoiceId');

  const amount = efaturaSendCost();

  const result = await kontorLedger.debit({
    tenantId,
    amount,
    referenceType: 'efatura_send',
    referenceId: invoiceId,
    description:
      description ?? `e-Fatura gönderimi (−${amount} kontör)`,
    createdBy: createdBy ?? null,
  });

  return {
    entry: result.entry,
    idempotentReplay: result.idempotentReplay,
  };
}
