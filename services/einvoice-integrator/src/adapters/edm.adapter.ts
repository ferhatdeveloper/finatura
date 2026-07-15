import type { ProviderCredentials } from '../config.js';
import {
  createFetchHttpClient,
  type HttpClient,
} from '../http/client.js';
import { assertLiveCredentials } from './credentials.js';
import {
  buildApproveSoap,
  buildGetPdfSoap,
  buildGetStatusSoap,
  buildLoginSoap,
  buildSendInvoiceSoap,
  extractXmlAttr,
  extractXmlTag,
  isEdmReturnOk,
  isSoapFault,
  parseSessionId,
  soapFaultMessage,
} from './edm.soap.js';
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

export interface EdmAdapterOptions {
  http?: HttpClient;
  /** SOAP servis yolu — varsayılan EFaturaEDM.svc */
  servicePath?: string;
}

/**
 * EDM Bilişim e-Fatura / e-Arşiv adapter.
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken SOAP HTTP iskeleti çalışır.
 */
export class EdmAdapter implements EinvoiceIntegrator {
  readonly provider = 'edm' as const;
  private readonly http: HttpClient;
  private readonly servicePath: string;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: EdmAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.servicePath = options.servicePath ?? '/EFaturaEDM/EFaturaEDM.svc';
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
    if (/EFaturaEDM|\.svc/i.test(base)) return base;
    return `${base}${this.servicePath}`;
  }

  private ensureLiveReady(): void {
    assertLiveCredentials(this.provider, this.credentials, 'EDM');
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
      },
      body: bodyXml,
    });
    return { status: res.status, body: res.body };
  }

  private async loginSession(): Promise<string> {
    const soap = buildLoginSoap(this.credentials);
    const { status, body } = await this.soapCall(
      'http://tempuri.org/IEFaturaEDM/Login',
      soap,
    );

    if (status >= 400 || isSoapFault(body)) {
      throw Object.assign(
        new Error(
          isSoapFault(body)
            ? soapFaultMessage(body, 'EDM Login SOAP Fault')
            : `EDM Login HTTP ${status}`,
        ),
        { status: status >= 400 ? status : 503, code: 'edm_login_failed', raw: body },
      );
    }

    const sessionId = parseSessionId(body);
    if (!sessionId || sessionId === '0') {
      throw Object.assign(
        new Error('EDM Login: SESSION_ID alınamadı. Kullanıcı/şifre veya endpoint kontrol edin.'),
        { status: 503, code: 'edm_login_failed', raw: body },
      );
    }
    return sessionId;
  }

  private failedSend(
    ettn: string,
    status: number,
    body: string,
  ): SendResult {
    return {
      success: false,
      provider: this.provider,
      stub: false,
      ettn,
      status: 'pending',
      errorMessage: isSoapFault(body)
        ? soapFaultMessage(body, 'EDM SOAP Fault')
        : !isEdmReturnOk(body)
          ? `EDM RETURN_CODE=${extractXmlTag(body, 'RETURN_CODE') ?? '?'}`
          : `EDM HTTP ${status}`,
      raw: { httpStatus: status, body },
    };
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const sessionId = await this.loginSession();
    const soap = buildSendInvoiceSoap(sessionId, this.credentials, payload, ettn);

    console.info(`[edm:live] sendInvoice → ${this.endpointUrl()}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IEFaturaEDM/SendInvoice',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isEdmReturnOk(body)) {
      return this.failedSend(ettn, status, body);
    }

    const providerRef =
      extractXmlAttr(body, 'INVOICE', 'ID') ||
      extractXmlAttr(body, 'INVOICE', 'UUID') ||
      extractXmlAttr(body, 'INVOICE', 'TRXID') ||
      extractXmlTag(body, 'INTL_TXN_ID') ||
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
    const sessionId = await this.loginSession();
    const soap = buildApproveSoap(sessionId, ettn, options);

    console.info(`[edm:live] approveInvoice`, { ettn, accept });

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IEFaturaEDM/SendInvoiceResponse',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isEdmReturnOk(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body, 'EDM SOAP Fault')
          : `EDM HTTP ${status}`,
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
    const sessionId = await this.loginSession();
    const soap = buildGetPdfSoap(sessionId, ettn);

    console.info(`[edm:live] downloadPdf`, { ettn });

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IEFaturaEDM/GetInvoiceWithType',
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
          ? soapFaultMessage(body, 'EDM SOAP Fault')
          : `EDM HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const base64 =
      extractXmlTag(body, 'CONTENT') ||
      extractXmlTag(body, 'INVOICE_CONTENT') ||
      extractXmlTag(body, 'Value');

    return {
      success: Boolean(base64),
      provider: this.provider,
      stub: false,
      ettn,
      contentType: 'application/pdf',
      base64,
      fileName: `edm-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'SOAP yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: status, body },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();
    const sessionId = await this.loginSession();
    const soap = buildGetStatusSoap(sessionId, ettn);

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IEFaturaEDM/GetInvoiceStatus',
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
          ? soapFaultMessage(body, 'EDM SOAP Fault')
          : `EDM HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const statusText = (
      extractXmlTag(body, 'STATUS') ||
      extractXmlTag(body, 'STATUS_DESCRIPTION') ||
      ''
    ).toLowerCase();

    let mapped: StatusResult['status'] = 'pending';
    if (/accept|onay|succeed|sent|gönder|kabul/i.test(statusText)) mapped = 'accepted';
    else if (/reject|red/i.test(statusText)) mapped = 'rejected';
    else if (/cancel|iptal/i.test(statusText)) mapped = 'cancelled';
    else if (/queue|kuyruk|wait|process/i.test(statusText)) mapped = 'queued';
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
