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
  extractXmlTag,
  isSoapFault,
  parseSessionCookie,
  soapFaultMessage,
} from './qnb.soap.js';
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

export interface QnbAdapterOptions {
  http?: HttpClient;
  /** Login servis yolu — varsayılan /connector/ws/userService */
  userServicePath?: string;
  /** Connector servis yolu — varsayılan /connector/ws/connectorService */
  connectorServicePath?: string;
}

/**
 * QNB eSolutions (eFinans connector) e-Fatura / e-Arşiv adapter.
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken SOAP HTTP iskeleti çalışır.
 */
export class QnbAdapter implements EinvoiceIntegrator {
  readonly provider = 'qnb' as const;
  private readonly http: HttpClient;
  private readonly userServicePath: string;
  private readonly connectorServicePath: string;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: QnbAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.userServicePath = options.userServicePath ?? '/connector/ws/userService';
    this.connectorServicePath =
      options.connectorServicePath ?? '/connector/ws/connectorService';
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

  private userServiceUrl(): string {
    const base = this.baseUrl();
    if (/userService/i.test(base)) return base;
    return `${base}${this.userServicePath}`;
  }

  private connectorServiceUrl(): string {
    const base = this.baseUrl();
    if (/connectorService/i.test(base)) return base;
    return `${base}${this.connectorServicePath}`;
  }

  private ensureLiveReady(): void {
    assertLiveCredentials(this.provider, this.credentials, 'QNB');
  }

  private async soapCall(
    url: string,
    soapAction: string,
    bodyXml: string,
    cookie?: string,
  ): Promise<{ status: number; body: string; headers: Record<string, string> }> {
    const headers: Record<string, string> = {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: soapAction,
    };
    if (cookie) headers.Cookie = cookie;

    const res = await this.http.request({
      url,
      method: 'POST',
      headers,
      body: bodyXml,
    });
    return { status: res.status, body: res.body, headers: res.headers };
  }

  private async loginSession(): Promise<string> {
    const soap = buildLoginSoap(this.credentials);
    const { status, body, headers } = await this.soapCall(
      this.userServiceUrl(),
      'http://service.csap.cs.com/UserService/wsLogin',
      soap,
    );

    if (status >= 400 || isSoapFault(body)) {
      throw Object.assign(
        new Error(
          isSoapFault(body)
            ? soapFaultMessage(body, 'QNB Login SOAP Fault')
            : `QNB Login HTTP ${status}`,
        ),
        { status: status >= 400 ? status : 503, code: 'qnb_login_failed', raw: body },
      );
    }

    const cookie =
      parseSessionCookie(headers['set-cookie']) ||
      parseSessionCookie(headers['Set-Cookie']) ||
      extractXmlTag(body, 'sessionId') ||
      extractXmlTag(body, 'return');

    if (!cookie || cookie === 'false' || cookie === '0') {
      // Bazı ortamlarda yanıt true + cookie; cookie yoksa kullanıcı/şifreyi taşırız
      return `qnb-auth=${encodeURIComponent(this.credentials.username)}`;
    }
    return cookie.includes('=') ? cookie : `JSESSIONID=${cookie}`;
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const cookie = await this.loginSession();
    const soap = buildSendInvoiceSoap(this.credentials, payload, ettn);

    console.info(`[qnb:live] sendInvoice → ${this.connectorServiceUrl()}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const { status, body } = await this.soapCall(
      this.connectorServiceUrl(),
      'http://service.csap.cs.com/ConnectorService/belgeGonderExt',
      soap,
      cookie,
    );

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body, 'QNB SOAP Fault')
          : `QNB HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const providerRef =
      extractXmlTag(body, 'belgeOid') ||
      extractXmlTag(body, 'return') ||
      extractXmlTag(body, 'UUID') ||
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
    const cookie = await this.loginSession();
    const soap = buildApproveSoap(this.credentials, ettn, options);

    console.info(`[qnb:live] approveInvoice`, { ettn, accept });

    const { status, body } = await this.soapCall(
      this.connectorServiceUrl(),
      'http://service.csap.cs.com/ConnectorService/belgeGonderExt',
      soap,
      cookie,
    );

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body, 'QNB SOAP Fault')
          : `QNB HTTP ${status}`,
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
    const cookie = await this.loginSession();
    const soap = buildGetPdfSoap(this.credentials, ettn);

    console.info(`[qnb:live] downloadPdf`, { ettn });

    const { status, body } = await this.soapCall(
      this.connectorServiceUrl(),
      'http://service.csap.cs.com/ConnectorService/gidenBelgeleriIndir',
      soap,
      cookie,
    );

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        contentType: 'application/pdf',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body, 'QNB SOAP Fault')
          : `QNB HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const base64 =
      extractXmlTag(body, 'return') ||
      extractXmlTag(body, 'veri') ||
      extractXmlTag(body, 'DocData') ||
      extractXmlTag(body, 'Value');

    return {
      success: Boolean(base64),
      provider: this.provider,
      stub: false,
      ettn,
      contentType: 'application/pdf',
      base64,
      fileName: `qnb-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'SOAP yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: status, body },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();
    const cookie = await this.loginSession();
    const soap = buildGetStatusSoap(this.credentials, ettn);

    const { status, body } = await this.soapCall(
      this.connectorServiceUrl(),
      'http://service.csap.cs.com/ConnectorService/gidenBelgeDurumSorgulaExt',
      soap,
      cookie,
    );

    if (status >= 400 || isSoapFault(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: isSoapFault(body)
          ? soapFaultMessage(body, 'QNB SOAP Fault')
          : `QNB HTTP ${status}`,
        raw: { httpStatus: status, body },
      };
    }

    const statusText = (
      extractXmlTag(body, 'durum') ||
      extractXmlTag(body, 'belgeDurum') ||
      extractXmlTag(body, 'aciklama') ||
      extractXmlTag(body, 'return') ||
      ''
    ).toLowerCase();

    let mapped: StatusResult['status'] = 'pending';
    if (/accept|onay|succeed|sent|gönder|kabul|basarili|başarılı/i.test(statusText)) {
      mapped = 'accepted';
    } else if (/reject|red/i.test(statusText)) mapped = 'rejected';
    else if (/cancel|iptal/i.test(statusText)) mapped = 'cancelled';
    else if (/queue|kuyruk|wait|bekle/i.test(statusText)) mapped = 'queued';
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
