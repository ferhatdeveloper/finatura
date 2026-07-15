import type { ProviderCredentials } from '../config.js';
import {
  createFetchHttpClient,
  type HttpClient,
} from '../http/client.js';
import { assertLiveCredentials } from './credentials.js';
import {
  buildApproveSoap,
  buildGetDocumentDataSoap,
  buildGetDocumentStatusSoap,
  buildLoginSoap,
  buildSendDocumentSoap,
  extractXmlTag,
  isElogoLoginOk,
  isSoapFault,
  parseSessionId,
  soapFaultMessage,
} from './elogo.soap.js';
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

export interface ElogoAdapterOptions {
  http?: HttpClient;
  /** SOAP servis yolu — varsayılan PostBoxService.svc */
  servicePath?: string;
}

/**
 * Logo eLogo e-Fatura / e-Arşiv adapter.
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken PostBoxService SOAP HTTP iskeleti çalışır.
 */
export class ElogoAdapter implements EinvoiceIntegrator {
  readonly provider = 'elogo' as const;
  private readonly http: HttpClient;
  private readonly servicePath: string;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: ElogoAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.servicePath =
      options.servicePath ?? '/webservice/PostBoxService.svc';
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
    if (/PostBoxService|\.svc/i.test(base)) return base;
    return `${base}${this.servicePath}`;
  }

  private ensureLiveReady(): void {
    assertLiveCredentials(this.provider, this.credentials, 'ELOGO');
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
      'http://tempuri.org/IPostBoxService/Login',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isElogoLoginOk(body)) {
      throw Object.assign(
        new Error(
          isSoapFault(body)
            ? soapFaultMessage(body, 'eLogo Login SOAP Fault')
            : `eLogo Login başarısız (HTTP ${status})`,
        ),
        { status: status >= 400 ? status : 503, code: 'elogo_login_failed', raw: body },
      );
    }

    const sessionId = parseSessionId(body);
    if (!sessionId) {
      throw Object.assign(
        new Error('eLogo Login: sessionID alınamadı. Kullanıcı/şifre veya endpoint kontrol edin.'),
        { status: 503, code: 'elogo_login_failed', raw: body },
      );
    }
    return sessionId;
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const sessionId = await this.loginSession();
    const soap = buildSendDocumentSoap(sessionId, this.credentials, payload, ettn);

    console.info(`[elogo:live] sendInvoice → ${this.endpointUrl()}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IPostBoxService/SendDocument',
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
          ? soapFaultMessage(body, 'eLogo SOAP Fault')
          : `eLogo HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const providerRef =
      extractXmlTag(body, 'uuid') ||
      extractXmlTag(body, 'UUID') ||
      extractXmlTag(body, 'documentId') ||
      extractXmlTag(body, 'DocumentId') ||
      extractXmlTag(body, 'refId') ||
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

    console.info(`[elogo:live] approveInvoice`, { ettn, accept });

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IPostBoxService/SendDocument',
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
          ? soapFaultMessage(body, 'eLogo SOAP Fault')
          : `eLogo HTTP ${status}`,
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
    const soap = buildGetDocumentDataSoap(sessionId, ettn);

    console.info(`[elogo:live] downloadPdf`, { ettn });

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IPostBoxService/GetDocumentData',
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
          ? soapFaultMessage(body, 'eLogo SOAP Fault')
          : `eLogo HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const base64 =
      extractXmlTag(body, 'binaryData') ||
      extractXmlTag(body, 'BinaryData') ||
      extractXmlTag(body, 'documentData') ||
      extractXmlTag(body, 'Data') ||
      extractXmlTag(body, 'Value');

    return {
      success: Boolean(base64),
      provider: this.provider,
      stub: false,
      ettn,
      contentType: 'application/pdf',
      base64,
      fileName: `elogo-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'SOAP yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: status, body },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();
    const sessionId = await this.loginSession();
    const soap = buildGetDocumentStatusSoap(sessionId, ettn);

    const { status, body } = await this.soapCall(
      'http://tempuri.org/IPostBoxService/GetDocumentStatus',
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
          ? soapFaultMessage(body, 'eLogo SOAP Fault')
          : `eLogo HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const statusText = (
      extractXmlTag(body, 'status') ||
      extractXmlTag(body, 'Status') ||
      extractXmlTag(body, 'statusCode') ||
      extractXmlTag(body, 'StatusDescription') ||
      extractXmlTag(body, 'code') ||
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
