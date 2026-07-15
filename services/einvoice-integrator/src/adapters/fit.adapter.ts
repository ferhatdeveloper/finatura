import type { ProviderCredentials } from '../config.js';
import {
  createFetchHttpClient,
  type HttpClient,
} from '../http/client.js';
import { assertLiveCredentials } from './credentials.js';
import {
  buildApproveSoap,
  buildGetInvoiceViewSoap,
  buildGetStatusSoap,
  buildSendUblSoap,
  extractXmlTag,
  isSoapFault,
  soapFaultMessage,
} from './fit.soap.js';
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

export interface FitAdapterOptions {
  http?: HttpClient;
  /** SOAP servis yolu — varsayılan ClientEInvoiceServices */
  servicePath?: string;
}

/**
 * FIT (Foriba / Sovos / Logo) e-Fatura / e-Arşiv adapter.
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken SOAP HTTP iskeleti çalışır.
 */
export class FitAdapter implements EinvoiceIntegrator {
  readonly provider = 'fit' as const;
  private readonly http: HttpClient;
  private readonly servicePath: string;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: FitAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.servicePath =
      options.servicePath ?? '/ClientEInvoiceServices/ClientEInvoiceServices.svc';
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
    if (/ClientEInvoice|\.svc/i.test(base)) return base;
    return `${base}${this.servicePath}`;
  }

  private ensureLiveReady(): void {
    assertLiveCredentials(this.provider, this.credentials, 'FIT');
  }

  private basicAuthHeader(): string {
    const token = Buffer.from(
      `${this.credentials.username}:${this.credentials.password}`,
      'utf8',
    ).toString('base64');
    return `Basic ${token}`;
  }

  private async soapCall(
    soapAction: string,
    bodyXml: string,
  ): Promise<{ status: number; body: string }> {
    const res = await this.http.request({
      url: this.endpointUrl(),
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: soapAction,
        Authorization: this.basicAuthHeader(),
      },
      body: bodyXml,
    });
    return { status: res.status, body: res.body };
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const soap = buildSendUblSoap(this.credentials, payload, ettn);

    console.info(`[fit:live] sendInvoice → ${this.endpointUrl()}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const { status, body } = await this.soapCall(
      'http://fitcons.com/eInvoice/SendUBL',
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
          ? soapFaultMessage(body, 'FIT SOAP Fault')
          : `FIT HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const providerRef =
      extractXmlTag(body, 'UUID') ||
      extractXmlTag(body, 'EnvUUID') ||
      extractXmlTag(body, 'InvoiceId') ||
      extractXmlTag(body, 'ID') ||
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

    console.info(`[fit:live] approveInvoice`, { ettn, accept });

    const { status, body } = await this.soapCall(
      'http://fitcons.com/eInvoice/SendUBL',
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
          ? soapFaultMessage(body, 'FIT SOAP Fault')
          : `FIT HTTP ${status}`,
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
    const soap = buildGetInvoiceViewSoap(this.credentials, ettn);

    console.info(`[fit:live] downloadPdf`, { ettn });

    const { status, body } = await this.soapCall(
      'http://fitcons.com/eInvoice/GetInvoiceView',
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
          ? soapFaultMessage(body, 'FIT SOAP Fault')
          : `FIT HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const base64 =
      extractXmlTag(body, 'DocData') ||
      extractXmlTag(body, 'BinaryData') ||
      extractXmlTag(body, 'Data') ||
      extractXmlTag(body, 'Value');

    return {
      success: Boolean(base64),
      provider: this.provider,
      stub: false,
      ettn,
      contentType: 'application/pdf',
      base64,
      fileName: `fit-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'SOAP yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: status, body },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();
    const soap = buildGetStatusSoap(this.credentials, ettn);

    const { status, body } = await this.soapCall(
      'http://fitcons.com/eInvoice/GetEnvelopeStatus',
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
          ? soapFaultMessage(body, 'FIT SOAP Fault')
          : `FIT HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const statusText = (
      extractXmlTag(body, 'Status') ||
      extractXmlTag(body, 'Code') ||
      extractXmlTag(body, 'Description') ||
      ''
    ).toLowerCase();

    let mapped: StatusResult['status'] = 'pending';
    if (/accept|onay|succeed|sent|gönder|kabul/i.test(statusText)) mapped = 'accepted';
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
