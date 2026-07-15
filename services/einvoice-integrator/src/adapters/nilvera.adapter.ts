import type { ProviderCredentials } from '../config.js';
import {
  createFetchHttpClient,
  type HttpClient,
} from '../http/client.js';
import { assertLiveCredentials } from './credentials.js';
import {
  buildSendAnswerBody,
  buildSendBase64Body,
  extractErrorMessage,
  extractPdfBase64,
  extractSendResponse,
  mapNilveraStatus,
  nilveraAuthHeader,
  serviceRootForKind,
  type NilveraServiceRoot,
} from './nilvera.rest.js';
import { ensureEttn, stubApprove, stubDownloadPdf, stubSend, stubStatus } from './stubHelpers.js';
import type {
  ApproveOptions,
  ApproveResult,
  EinvoiceIntegrator,
  InvoiceDraftPayload,
  PdfDownloadResult,
  SendResult,
  StatusResult,
} from './types.js';

export interface NilveraAdapterOptions {
  http?: HttpClient;
  /** REST kök yolu — varsayılan belge türüne göre /einvoice veya /earchive */
  serviceRoot?: NilveraServiceRoot;
}

/**
 * Nilvera e-Fatura / e-Arşiv adapter (REST).
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken Bearer + REST iskeleti çalışır.
 */
export class NilveraAdapter implements EinvoiceIntegrator {
  readonly provider = 'nilvera' as const;
  private readonly http: HttpClient;
  private readonly fixedServiceRoot?: NilveraServiceRoot;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: NilveraAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.fixedServiceRoot = options.serviceRoot;
  }

  async sendInvoice(payload: InvoiceDraftPayload): Promise<SendResult> {
    if (this.stubMode) return stubSend(this.provider, payload);
    return this.liveSend(payload);
  }

  async approveInvoice(ettn: string, options?: ApproveOptions): Promise<ApproveResult> {
    if (this.stubMode) return stubApprove(this.provider, ettn, options);
    return this.liveApprove(ettn, options);
  }

  async downloadPdf(ettn: string): Promise<PdfDownloadResult> {
    if (this.stubMode) return stubDownloadPdf(this.provider, ettn);
    return this.liveDownloadPdf(ettn);
  }

  async getStatus(ettn: string): Promise<StatusResult> {
    if (this.stubMode) return stubStatus(this.provider, ettn);
    return this.liveGetStatus(ettn);
  }

  private baseUrl(): string {
    return this.credentials.baseUrl.replace(/\/+$/, '');
  }

  private apiUrl(path: string, root: NilveraServiceRoot = 'einvoice'): string {
    const base = this.baseUrl();
    if (/\/(einvoice|earchive)(\/|$)/i.test(base)) {
      return `${base}${path.startsWith('/') ? path : `/${path}`}`;
    }
    return `${base}/${root}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private ensureLiveReady(): void {
    assertLiveCredentials(this.provider, this.credentials, 'NILVERA', {
      allowApiKeyAuth: true,
    });
  }

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: nilveraAuthHeader(this.credentials),
      Accept: 'application/json',
      ...extra,
    };
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const root = this.fixedServiceRoot ?? serviceRootForKind(payload.kind);
    const url = this.apiUrl('/Send/Base64String', root);
    const body = buildSendBase64Body(this.credentials, payload, ettn);

    console.info(`[nilvera:live] sendInvoice → ${url}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const res = await this.http.request({
      url,
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });

    if (res.status >= 400) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: extractErrorMessage(res.body, `Nilvera HTTP ${res.status}`),
        raw: { httpStatus: res.status, body: res.body },
      };
    }

    const parsed = extractSendResponse(res.body);
    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn: parsed.uuid || ettn,
      documentNumber: parsed.invoiceNumber || payload.documentNumber,
      providerRef: parsed.uuid || ettn,
      status: 'sent',
      raw: { httpStatus: res.status, body: res.body },
    };
  }

  private async liveApprove(
    ettn: string,
    options?: ApproveOptions,
  ): Promise<ApproveResult> {
    this.ensureLiveReady();
    const accept = options?.accept !== false;
    const url = this.apiUrl('/Purchase/SendAnswer', 'einvoice');
    const body = buildSendAnswerBody(ettn, options);

    console.info(`[nilvera:live] approveInvoice`, { ettn, accept });

    const res = await this.http.request({
      url,
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });

    if (res.status >= 400) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: extractErrorMessage(res.body, `Nilvera HTTP ${res.status}`),
        raw: { httpStatus: res.status, body: res.body },
      };
    }

    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      status: accept ? 'accepted' : 'rejected',
      raw: { httpStatus: res.status, body: res.body },
    };
  }

  private async liveDownloadPdf(ettn: string): Promise<PdfDownloadResult> {
    this.ensureLiveReady();
    const root = this.fixedServiceRoot ?? 'einvoice';
    const url = this.apiUrl(`/Sale/${encodeURIComponent(ettn)}/pdf`, root);

    console.info(`[nilvera:live] downloadPdf`, { ettn });

    const res = await this.http.request({
      url,
      method: 'GET',
      headers: this.authHeaders({ Accept: 'application/pdf, application/json' }),
    });

    if (res.status >= 400) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        contentType: 'application/pdf',
        errorMessage: extractErrorMessage(res.body, `Nilvera HTTP ${res.status}`),
        raw: { httpStatus: res.status, body: res.body },
      };
    }

    const base64 = extractPdfBase64(res.body, res.headers['content-type']);

    return {
      success: Boolean(base64),
      provider: this.provider,
      stub: false,
      ettn,
      contentType: 'application/pdf',
      base64,
      fileName: `nilvera-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'Nilvera yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: res.status, body: res.body },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();
    const root = this.fixedServiceRoot ?? 'einvoice';
    const url = this.apiUrl(`/Sale/${encodeURIComponent(ettn)}/Status`, root);

    const res = await this.http.request({
      url,
      method: 'GET',
      headers: this.authHeaders(),
    });

    if (res.status >= 400) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: extractErrorMessage(res.body, `Nilvera HTTP ${res.status}`),
        raw: { httpStatus: res.status, body: res.body },
      };
    }

    const mapped = mapNilveraStatus(res.body);
    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      status: mapped.status,
      raw: { httpStatus: res.status, body: res.body, detail: mapped.detail },
    };
  }
}
