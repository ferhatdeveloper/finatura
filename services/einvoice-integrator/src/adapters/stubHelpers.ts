import { randomUUID } from 'node:crypto';
import type { IntegratorProvider } from '../config.js';
import type {
  ApproveOptions,
  ApproveResult,
  InvoiceDraftPayload,
  PdfDownloadResult,
  SendResult,
  StatusResult,
} from './types.js';

/** Minimal geçerli görünen 1x1 PDF (stub indirme için) */
const STUB_PDF_BASE64 =
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFN0dWIgZV8tRmF0dXJhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAgbiAKMDAwMDAwMDIxMCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMwMQolJUVPRgo=';

export function ensureEttn(payload: InvoiceDraftPayload): string {
  return payload.ettn?.trim() || randomUUID();
}

export function stubSend(
  provider: IntegratorProvider,
  payload: InvoiceDraftPayload,
): SendResult {
  const ettn = ensureEttn(payload);
  const documentNumber =
    payload.documentNumber?.trim() ||
    `${provider.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${ettn.slice(0, 8).toUpperCase()}`;

  console.info(`[${provider}:stub] sendInvoice`, {
    ettn,
    kind: payload.kind,
    localInvoiceId: payload.localInvoiceId,
    grandTotal: payload.grandTotal,
  });

  return {
    success: true,
    provider,
    stub: true,
    ettn,
    documentNumber,
    providerRef: `stub-${provider}-${ettn}`,
    status: 'sent',
    raw: {
      mode: 'stub',
      message: `${provider} stub: fatura kuyruğa alındı / gönderildi simülasyonu`,
      payloadSummary: {
        kind: payload.kind,
        receiver: payload.receiverVknOrTckn,
        grandTotal: payload.grandTotal,
        hasUbl: Boolean(payload.ublXml),
      },
    },
  };
}

export function stubApprove(
  provider: IntegratorProvider,
  ettn: string,
  options?: ApproveOptions,
): ApproveResult {
  const accept = options?.accept !== false;
  console.info(`[${provider}:stub] approveInvoice`, { ettn, accept });

  return {
    success: true,
    provider,
    stub: true,
    ettn,
    status: accept ? 'accepted' : 'rejected',
    raw: {
      mode: 'stub',
      message: accept
        ? `${provider} stub: fatura onaylandı simülasyonu`
        : `${provider} stub: fatura reddedildi simülasyonu`,
      reason: options?.reason,
    },
  };
}

export function stubDownloadPdf(
  provider: IntegratorProvider,
  ettn: string,
): PdfDownloadResult {
  console.info(`[${provider}:stub] downloadPdf`, { ettn });

  return {
    success: true,
    provider,
    stub: true,
    ettn,
    contentType: 'application/pdf',
    base64: STUB_PDF_BASE64,
    fileName: `${provider}-${ettn}.pdf`,
    raw: {
      mode: 'stub',
      message: `${provider} stub: PDF içeriği simülasyonu`,
    },
  };
}

export function stubStatus(provider: IntegratorProvider, ettn: string): StatusResult {
  return {
    success: true,
    provider,
    stub: true,
    ettn,
    status: 'accepted',
    raw: { mode: 'stub', message: `${provider} stub: durum=accepted` },
  };
}

export function liveNotImplemented(
  provider: IntegratorProvider,
  operation: string,
): never {
  throw new Error(
    `${provider}: gerçek API henüz bağlanmadı (stub kapalı). Operasyon: ${operation}. ` +
      `EINVOICE_STUB_MODE=true ile geliştirme yapın veya adapter içindeki live* metodlarını doldurun.`,
  );
}
