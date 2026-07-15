import type { ProviderCredentials } from '../config.js';
import {
  createFetchHttpClient,
  type HttpClient,
} from '../http/client.js';
import { assertOAuthLiveCredentials } from './credentials.js';
import {
  buildNesApproveBody,
  buildNesSendBody,
  extractNesPdfBase64,
  extractNesProviderRef,
  fetchNesAccessToken,
  isNesSuccessStatus,
  mapNesStatus,
  nesBaseUrl,
  nesErrorMessage,
  NES_DEFAULT_PATHS,
  parseJsonBody,
  type NesRestPaths,
  type NesTokenResult,
} from './nes.rest.js';
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

export interface NesAdapterOptions {
  http?: HttpClient;
  paths?: Partial<NesRestPaths>;
}

/**
 * NES e-Fatura / e-Arşiv adapter (REST + OAuth2).
 * Stub varsayılan; EINVOICE_STUB_MODE=false iken OAuth token + REST iskeleti çalışır.
 */
export class NesAdapter implements EinvoiceIntegrator {
  readonly provider = 'nes' as const;
  private readonly http: HttpClient;
  private readonly paths: NesRestPaths;
  private cachedToken: { token: NesTokenResult; expiresAt: number } | undefined;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly stubMode: boolean,
    options: NesAdapterOptions = {},
  ) {
    this.http = options.http ?? createFetchHttpClient();
    this.paths = {
      ...NES_DEFAULT_PATHS,
      ...options.paths,
      pdf: options.paths?.pdf ?? NES_DEFAULT_PATHS.pdf,
      status: options.paths?.status ?? NES_DEFAULT_PATHS.status,
    };
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

  private ensureLiveReady(): void {
    assertOAuthLiveCredentials(this.provider, this.credentials, 'NES');
  }

  private async bearerToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 5_000) {
      return this.cachedToken.token.accessToken;
    }

    const token = await fetchNesAccessToken(this.http, this.credentials, this.paths);
    const ttlMs = (token.expiresIn ?? 3600) * 1000;
    this.cachedToken = { token, expiresAt: now + ttlMs };
    return token.accessToken;
  }

  private async restCall(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: string; json: Record<string, unknown> }> {
    const token = await this.bearerToken();
    const url = `${nesBaseUrl(this.credentials)}${path}`;
    const res = await this.http.request({
      url,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: res.body, json: parseJsonBody(res.body) };
  }

  private async liveSend(payload: InvoiceDraftPayload): Promise<SendResult> {
    this.ensureLiveReady();
    const ettn = ensureEttn(payload);
    const requestBody = buildNesSendBody(this.credentials, payload, ettn);

    console.info(`[nes:live] sendInvoice → ${nesBaseUrl(this.credentials)}${this.paths.send}`, {
      ettn,
      kind: payload.kind,
      hasUbl: Boolean(payload.ublXml),
    });

    const { status, body, json } = await this.restCall('POST', this.paths.send, requestBody);

    if (!isNesSuccessStatus(status, json)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: nesErrorMessage(status, json, 'NES send'),
        raw: { httpStatus: status, body, json },
      };
    }

    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      documentNumber: payload.documentNumber,
      providerRef: extractNesProviderRef(json, ettn),
      status: 'sent',
      raw: { httpStatus: status, body, json },
    };
  }

  private async liveApprove(
    ettn: string,
    options?: ApproveOptions,
  ): Promise<ApproveResult> {
    this.ensureLiveReady();
    const accept = options?.accept !== false;

    console.info(`[nes:live] approveInvoice`, { ettn, accept });

    const { status, body, json } = await this.restCall(
      'POST',
      this.paths.approve,
      buildNesApproveBody(ettn, options),
    );

    if (!isNesSuccessStatus(status, json)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: nesErrorMessage(status, json, 'NES approve'),
        raw: { httpStatus: status, body, json },
      };
    }

    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      status: accept ? 'accepted' : 'rejected',
      raw: { httpStatus: status, body, json },
    };
  }

  private async liveDownloadPdf(ettn: string): Promise<PdfDownloadResult> {
    this.ensureLiveReady();

    console.info(`[nes:live] downloadPdf`, { ettn });

    const { status, body, json } = await this.restCall('GET', this.paths.pdf(ettn));

    if (!isNesSuccessStatus(status, json)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        contentType: 'application/pdf',
        errorMessage: nesErrorMessage(status, json, 'NES pdf'),
        raw: { httpStatus: status, body, json },
      };
    }

    const base64 = extractNesPdfBase64(json);

    return {
      success: Boolean(base64),
      provider: this.provider,
      stub: false,
      ettn,
      contentType: 'application/pdf',
      base64,
      fileName: `nes-${ettn}.pdf`,
      errorMessage: base64 ? undefined : 'NES yanıtında PDF verisi bulunamadı',
      raw: { httpStatus: status, body, json },
    };
  }

  private async liveGetStatus(ettn: string): Promise<StatusResult> {
    this.ensureLiveReady();

    const { status, body, json } = await this.restCall('GET', this.paths.status(ettn));

    if (!isNesSuccessStatus(status, json)) {
      return {
        success: false,
        provider: this.provider,
        stub: false,
        ettn,
        status: 'pending',
        errorMessage: nesErrorMessage(status, json, 'NES status'),
        raw: { httpStatus: status, body, json },
      };
    }

    const statusRaw =
      json.durum ?? json.status ?? json.state ?? json.Status ?? json.code;

    return {
      success: true,
      provider: this.provider,
      stub: false,
      ettn,
      status: mapNesStatus(statusRaw),
      raw: { httpStatus: status, body, json, statusRaw },
    };
  }
}
