import type { EinvoiceIntegrator, InvoiceDraftPayload } from '../adapters/types.js';
import type {
  ApproveResult,
  PdfDownloadResult,
  SendResult,
} from '../adapters/types.js';

export type FlowStage = 'send' | 'approve' | 'pdf' | 'complete';

export interface SendApprovePdfOptions {
  /** Onay adımını atla (ör. e-Arşiv / otomatik onay senaryosu) */
  skipApprove?: boolean;
  /** approveInvoice accept bayrağı */
  accept?: boolean;
  approveReason?: string;
}

export interface SendApprovePdfResult {
  ok: boolean;
  stage: FlowStage;
  ettn?: string;
  send?: SendResult;
  approve?: ApproveResult;
  pdf?: PdfDownloadResult;
  errorMessage?: string;
}

/**
 * Aşama 3.2 ana akış iskeleti:
 *   1) gönder  →  2) onayla (opsiyonel)  →  3) PDF indir
 *
 * Transformer (3.1) çıktısı `payload.ublXml` olarak buraya verilir.
 * Tenant DB `invoices` güncellemesi bilerek burada yok; API katmanı / üst servis yapar.
 */
export async function runSendApprovePdfFlow(
  integrator: EinvoiceIntegrator,
  payload: InvoiceDraftPayload,
  options: SendApprovePdfOptions = {},
): Promise<SendApprovePdfResult> {
  let send: SendResult;

  try {
    send = await integrator.sendInvoice(payload);
  } catch (err) {
    return {
      ok: false,
      stage: 'send',
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  if (!send.success) {
    return {
      ok: false,
      stage: 'send',
      ettn: send.ettn,
      send,
      errorMessage: send.errorMessage ?? 'Gönderim başarısız',
    };
  }

  let approve: ApproveResult | undefined;

  if (!options.skipApprove) {
    try {
      approve = await integrator.approveInvoice(send.ettn, {
        accept: options.accept !== false,
        reason: options.approveReason,
      });
    } catch (err) {
      return {
        ok: false,
        stage: 'approve',
        ettn: send.ettn,
        send,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }

    if (!approve.success) {
      return {
        ok: false,
        stage: 'approve',
        ettn: send.ettn,
        send,
        approve,
        errorMessage: approve.errorMessage ?? 'Onay başarısız',
      };
    }
  }

  let pdf: PdfDownloadResult;

  try {
    pdf = await integrator.downloadPdf(send.ettn);
  } catch (err) {
    return {
      ok: false,
      stage: 'pdf',
      ettn: send.ettn,
      send,
      approve,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  if (!pdf.success) {
    return {
      ok: false,
      stage: 'pdf',
      ettn: send.ettn,
      send,
      approve,
      pdf,
      errorMessage: pdf.errorMessage ?? 'PDF indirme başarısız',
    };
  }

  return {
    ok: true,
    stage: 'complete',
    ettn: send.ettn,
    send,
    approve,
    pdf,
  };
}
