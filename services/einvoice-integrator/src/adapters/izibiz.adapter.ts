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
  isIzibizReturnOk,
  isSoapFault,
  izibizErrorMessage,
  parseSessionId,
} from './izibiz.soap.js';
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

export interface IzibizAdapterOptions {
  http?: HttpClient;
  /** Kimlik doğrulama yolu — varsayılan AuthenticationWS */
  authPath?: string;
  /** E-Fatura SOAP yolu — varsayılan EInvoiceWS */
  invoicePath?: string;
}

/**
 * İzibiz e-Fatura / e-Arşiv adapter.
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken Login + EInvoiceWS SOAP iskeleti çalışır.
 */
export class IzibizAdapter implements EinvoiceIntegrator {
  readonly provider = 'izibiz' as const;
  private readonly http: HttpClient;
  private readonly authPath: string;
  private readonly invoicePath: string;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: IzibizAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.authPath = options.authPath ?? '/AuthenticationWS';
    this.invoicePath = options.invoicePath ?? '/EInvoiceWS';
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

  private authUrl(): string {
    const base = this.baseUrl();
    if (/AuthenticationWS/i.test(base)) return base;
    return `${base}${this.authPath}`;
  }

  private invoiceUrl(): string {
    const base = this.baseUrl();
    if (/EInvoiceWS|EIArchiveWS/i.test(base)) return base;
    return `${base}${this.invoicePath}`;
  }

  private ensureLiveReady(): void {
    assertLiveCredentials(this.provider, this.credentials, 'IZIBIZ');
  }

  private async soapCall(
    url: string,
    soapAction: string,
    bodyXml: string,
  ): Promise<{ status: number; body: string }> {
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

  private async loginSession(): Promise<string> {
    const soap = buildLoginSoap(this.credentials);
    const { status, body } = await this.soapCall(
      this.authUrl(),
      'http://schemas.i2i.com/ei/wsdl/Login',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isIzibizReturnOk(body)) {
      throw Object.assign(
        new Error(
          status >= 400 && !isSoapFault(body)
            ? `İzibiz Login HTTP ${status}`
            : izibizErrorMessage(body, 'İzibiz Login başarısız'),
        ),
        { status: status >= 400 ? status : 503, code: 'izibiz_login_failed', raw: body },
      );
    }

    const sessionId = parseSessionId(body);
    if (!sessionId || sessionId === '-1' || sessionId === '0') {
      throw Object.assign(
        new Error('İzibiz Login: SESSION_ID alınamadı. Kullanıcı/şifre veya endpoint kontrol edin.'),
        { status: 503, code: 'izibiz_login_failed', raw: body },
      );
    }
    return sessionId;
  }

  private failedSend(ettn: string, status: number, body: string): SendResult {
    return {
      success: false,
      provider: this.provider,
      stub: false,
      ettn,
      status: 'pending',
      errorMessage:
        status >= 400 && !isSoapFault(body) && isIzibizReturnOk(body)
          ? `İzibiz HTTP ${status}`
          : izibizErrorMessage(body, `İzibiz HTTP ${status}`),
      raw: { httpStatus: status, body },
    };
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const sessionId = await this.loginSession();
    const soap = buildSendInvoiceSoap(sessionId, this.credentials, payload, ettn);

    console.info(`[izibiz:live] sendInvoice → ${this.invoiceUrl()}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const { status, body } = await this.soapCall(
      this.invoiceUrl(),
      'http://schemas.i2i.com/ei/wsdl/SendInvoice',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isIzibizReturnOk(body)) {
      return this.failedSend(ettn, status, body);
    }

    const providerRef =
      extractXmlAttr(body, 'INVOICE', 'ID') ||
      extractXmlAttr(body, 'INVOICE', 'UUID') ||
      extractXmlTag(body, 'INVOICE_ID') ||
      extractXmlTag(body, 'INTL_TXN_ID') ||
      extractXmlTag(body, 'INT_TXN_ID') ||
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

    console.info(`[izibiz:live] approveInvoice`, { ettn, accept });

    const { status, body } = await this.soapCall(
      this.invoiceUrl(),
      'http://schemas.i2i.com/ei/wsdl/SendInvoiceResponseWithServerSign',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isIzibizReturnOk(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: izibizErrorMessage(body, `İzibiz HTTP ${status}`),
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

    console.info(`[izibiz:live] downloadPdf`, { ettn });

    const { status, body } = await this.soapCall(
      this.invoiceUrl(),
      'http://schemas.i2i.com/ei/wsdl/GetInvoiceWithType',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isIzibizReturnOk(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        contentType: 'application/pdf',
        errorMessage: izibizErrorMessage(body, `İzibiz HTTP ${status}`),
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
      fileName: `izibiz-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'SOAP yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: status, body },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();
    const sessionId = await this.loginSession();
    const soap = buildGetStatusSoap(sessionId, ettn);

    const { status, body } = await this.soapCall(
      this.invoiceUrl(),
      'http://schemas.i2i.com/ei/wsdl/GetInvoiceStatus',
      soap,
    );

    if (status >= 400 || isSoapFault(body) || !isIzibizReturnOk(body)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: izibizErrorMessage(body, `İzibiz HTTP ${status}`),
        raw: { httpStatus: status, body },
      };
    }

    const statusText = (
      extractXmlTag(body, 'STATUS') ||
      extractXmlTag(body, 'STATUS_DESCRIPTION') ||
      extractXmlTag(body, 'SUB_STATUS') ||
      ''
    ).toLowerCase();

    let mapped: StatusResult['status'] = 'pending';
    if (/accept|onay|succeed|kabul|112/i.test(statusText)) mapped = 'accepted';
    else if (/reject|red|120/i.test(statusText)) mapped = 'rejected';
    else if (/cancel|iptal/i.test(statusText)) mapped = 'cancelled';
    else if (/queue|kuyruk|wait|process|load_|package_|sign_/i.test(statusText)) {
      mapped = 'queued';
    } else if (statusText) mapped = 'sent';

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
