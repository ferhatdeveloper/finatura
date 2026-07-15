import type { ProviderCredentials } from '../config.js';
import {
  createFetchHttpClient,
  type HttpClient,
} from '../http/client.js';
import { assertLiveCredentials } from './credentials.js';
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
import {
  buildApproveSoap,
  buildGetPdfSoap,
  buildGetStatusSoap,
  buildSendInvoiceSoap,
  extractXmlTag,
  isSoapFault,
  soapFaultMessage,
} from './uyumsoft.soap.js';

export interface UyumsoftAdapterOptions {
  http?: HttpClient;
  /** SOAP servis yolu — varsayılan BasicIntegration */
  servicePath?: string;
}

/**
 * Uyumsoft e-Fatura / e-Arşiv adapter.
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken SOAP HTTP iskeleti çalışır.
 */
export class UyumsoftAdapter implements EinvoiceIntegrator {
  readonly provider = 'uyumsoft' as const;
  private readonly http: HttpClient;
  private readonly servicePath: string;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: UyumsoftAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.servicePath = options.servicePath ?? '/Services/BasicIntegration';
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

  private endpointUrl(): string {
    const base = this.credentials.baseUrl.replace(/\/+$/, '');
    if (/BasicIntegration|Integration/i.test(base)) return base;
    return `${base}${this.servicePath}`;
  }

  private ensureLiveReady(): void {
    assertLiveCredentials(this.provider, this.credentials, 'UYUMSOFT');
  }

  private async soapCall(soapAction: string, bodyXml: string): Promise<{ status: number; body: string }> {
    const url = this.endpointUrl();

    const res = await this.http.request({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: soapAction,
      },
      body: bodyXml,
    });

    return { status: res.status, body: res.body };
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const soap = buildSendInvoiceSoap(this.credentials, payload, ettn);

    console.info(`[uyumsoft:live] sendInvoice → ${this.endpointUrl()}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const { status, body } = await this.soapCall('http://tempuri.org/IBasicIntegration/SendInvoice', soap);

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body)
          : `Uyumsoft HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const providerRef =
      extractXmlTag(body, 'InvoiceId') ||
      extractXmlTag(body, 'Id') ||
      extractXmlTag(body, 'Value') ||
      ettn;

    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      documentNumber: payload.documentNumber,
      providerRef,
      status: 'sent',
      raw: { httpStatus: status, body },
    };
  }

  private async liveApprove(
    ettn: string,
    options?: ApproveOptions,
  ): Promise<ApproveResult> {
    this.ensureLiveReady();
    const accept = options?.accept !== false;
    const soap = buildApproveSoap(this.credentials, ettn, options);
    const action = accept
      ? 'http://tempuri.org/IBasicIntegration/AcceptInvoice'
      : 'http://tempuri.org/IBasicIntegration/RejectInvoice';

    console.info(`[uyumsoft:live] approveInvoice`, { ettn, accept });

    const { status, body } = await this.soapCall(action, soap);

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body)
          : `Uyumsoft HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      status: accept ? 'accepted' : 'rejected',
      raw: { httpStatus: status, body },
    };
  }

  private async liveDownloadPdf(ettn: string): Promise<PdfDownloadResult> {
    this.ensureLiveReady();
    const soap = buildGetPdfSoap(this.credentials, ettn);

    console.info(`[uyumsoft:live] downloadPdf`, { ettn });

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IBasicIntegration/GetOutboxInvoicePdf',
      soap,
    );

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        contentType: 'application/pdf',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body)
          : `Uyumsoft HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const base64 =
      extractXmlTag(body, 'Data') ||
      extractXmlTag(body, 'PdfData') ||
      extractXmlTag(body, 'Value');

    return {
      success: Boolean(base64),
      provider: this.provider,
      stub: false,
      ettn,
      contentType: 'application/pdf',
      base64,
      fileName: `uyumsoft-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'SOAP yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: status, body },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();
    const soap = buildGetStatusSoap(this.credentials, ettn);

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IBasicIntegration/GetInvoiceStatus',
      soap,
    );

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body)
          : `Uyumsoft HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const statusText = (
      extractXmlTag(body, 'Status') ||
      extractXmlTag(body, 'InvoiceStatus') ||
      extractXmlTag(body, 'Code') ||
      ''
    ).toLowerCase();

    let mapped: StatusResult['status'] = 'pending';
    if (/accept|onay|succeed|sent|gönder/i.test(statusText)) mapped = 'accepted';
    else if (/reject|red/i.test(statusText)) mapped = 'rejected';
    else if (/cancel|iptal/i.test(statusText)) mapped = 'cancelled';
    else if (/queue|kuyruk|wait/i.test(statusText)) mapped = 'queued';
    else if (statusText) mapped = 'sent';

    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      status: mapped,
      raw: { httpStatus: status, body, statusText },
    };
  }
}
