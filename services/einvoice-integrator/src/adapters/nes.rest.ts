import type { ProviderCredentials } from '../config.js';
import type { HttpClient } from '../http/client.js';
import type { ApproveOptions, InvoiceDraftPayload, IntegratorInvoiceStatus } from './types.js';

/**
 * NES (Modern REST + OAuth2) iskeleti.
 * Gerçek path / alan adları bayilik Swagger’ına göre ince ayarlanabilir.
 *
 * Tipik akış:
 *   1) POST /oauth/token  → access_token
 *   2) Bearer ile /fatura/* REST çağrıları
 */

export interface NesTokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  raw: unknown;
}

export interface NesRestPaths {
  token: string;
  send: string;
  approve: string;
  pdf: (ettn: string) => string;
  status: (ettn: string) => string;
}

export const NES_DEFAULT_PATHS: NesRestPaths = {
  token: '/oauth/token',
  send: '/fatura/olustur',
  approve: '/fatura/yanit',
  pdf: (ettn) => `/fatura/${encodeURIComponent(ettn)}/pdf`,
  status: (ettn) => `/fatura/${encodeURIComponent(ettn)}/durum`,
};

export function nesBaseUrl(credentials: ProviderCredentials): string {
  return credentials.baseUrl.replace(/\/+$/, '');
}

export function buildNesTokenForm(credentials: ProviderCredentials): string {
  const clientId = credentials.clientId?.trim() || '';
  const clientSecret = credentials.clientSecret?.trim() || '';
  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);

  const user = credentials.username?.trim();
  const pass = credentials.password?.trim();
  if (user && pass) {
    params.set('grant_type', 'password');
    params.set('username', user);
    params.set('password', pass);
  } else {
    params.set('grant_type', 'client_credentials');
  }

  return params.toString();
}

export function parseNesTokenResponse(body: string): NesTokenResult {
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error('NES OAuth: geçersiz JSON token yanıtı'), {
      status: 502,
      code: 'nes_token_parse_error',
      raw: body,
    });
  }

  const accessToken =
    (typeof json.access_token === 'string' && json.access_token) ||
    (typeof json.accessToken === 'string' && json.accessToken) ||
    '';

  if (!accessToken) {
    const errMsg =
      (typeof json.error_description === 'string' && json.error_description) ||
      (typeof json.error === 'string' && json.error) ||
      (typeof json.message === 'string' && json.message) ||
      'access_token yok';
    throw Object.assign(new Error(`NES OAuth: ${errMsg}`), {
      status: 401,
      code: 'nes_token_error',
      raw: json,
    });
  }

  const expiresIn =
    typeof json.expires_in === 'number'
      ? json.expires_in
      : typeof json.expiresIn === 'number'
        ? json.expiresIn
        : undefined;

  return {
    accessToken,
    tokenType:
      (typeof json.token_type === 'string' && json.token_type) ||
      (typeof json.tokenType === 'string' && json.tokenType) ||
      'Bearer',
    expiresIn,
    raw: json,
  };
}

export async function fetchNesAccessToken(
  http: HttpClient,
  credentials: ProviderCredentials,
  paths: NesRestPaths = NES_DEFAULT_PATHS,
): Promise<NesTokenResult> {
  const url = `${nesBaseUrl(credentials)}${paths.token}`;
  const res = await http.request({
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: buildNesTokenForm(credentials),
  });

  if (res.status >= 400) {
    throw Object.assign(
      new Error(`NES OAuth HTTP ${res.status}: ${res.body.slice(0, 200)}`),
      { status: res.status, code: 'nes_token_http_error', raw: res.body },
    );
  }

  return parseNesTokenResponse(res.body);
}

export function buildNesSendBody(
  credentials: ProviderCredentials,
  payload: InvoiceDraftPayload,
  ettn: string,
): Record<string, unknown> {
  const vkn = credentials.vkn || payload.senderVkn;
  const faturaTipi =
    payload.kind === 'earsiv'
      ? 'EARSIV'
      : payload.kind === 'gider_pusulasi'
        ? 'GIDER_PUSULASI'
        : 'EFATURA';

  return {
    uuid: ettn,
    ettn,
    belgeNo: payload.documentNumber,
    vergiNo: vkn,
    aliciVknTckn: payload.receiverVknOrTckn,
    aliciUnvan: payload.receiverTitle,
    faturaTipi,
    tarih: payload.issueDate,
    paraBirimi: payload.currencyCode ?? 'TRY',
    netToplam: payload.netTotal,
    kdvToplam: payload.vatTotal,
    genelToplam: payload.grandTotal,
    tutar: payload.grandTotal,
    ublXml: payload.ublXml,
    localInvoiceId: payload.localInvoiceId,
    metadata: payload.metadata,
  };
}

export function buildNesApproveBody(
  ettn: string,
  options?: ApproveOptions,
): Record<string, unknown> {
  const accept = options?.accept !== false;
  return {
    uuid: ettn,
    ettn,
    kabul: accept,
    yanitKodu: accept ? 'KABUL' : 'RED',
    aciklama: options?.reason ?? (accept ? 'Kabul' : 'Red'),
  };
}

export function parseJsonBody(body: string): Record<string, unknown> {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return { rawText: body };
  }
}

export function extractNesProviderRef(json: Record<string, unknown>, fallback: string): string {
  const keys = ['uuid', 'ettn', 'id', 'documentId', 'faturaId', 'reference', 'callId'];
  for (const key of keys) {
    const v = json[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const data = json.data;
  if (data && typeof data === 'object') {
    return extractNesProviderRef(data as Record<string, unknown>, fallback);
  }
  return fallback;
}

export function extractNesPdfBase64(json: Record<string, unknown>): string | undefined {
  const keys = ['pdfBase64', 'base64', 'content', 'data', 'pdf'];
  for (const key of keys) {
    const v = json[key];
    if (typeof v === 'string' && v.trim().length > 20) return v.trim();
  }
  const nested = json.data;
  if (nested && typeof nested === 'object') {
    return extractNesPdfBase64(nested as Record<string, unknown>);
  }
  return undefined;
}

export function mapNesStatus(raw: unknown): IntegratorInvoiceStatus {
  const text = String(raw ?? '').toLowerCase();
  if (/accept|onay|kabul|succeed|basar|sent|gönder|gonder/i.test(text)) return 'accepted';
  if (/reject|red/i.test(text)) return 'rejected';
  if (/cancel|iptal/i.test(text)) return 'cancelled';
  if (/queue|kuyruk|wait|bekle/i.test(text)) return 'queued';
  if (text) return 'sent';
  return 'pending';
}

export function nesErrorMessage(
  status: number,
  json: Record<string, unknown>,
  fallback: string,
): string {
  const msg =
    (typeof json.message === 'string' && json.message) ||
    (typeof json.error_description === 'string' && json.error_description) ||
    (typeof json.error === 'string' && json.error) ||
    (typeof json.hata === 'string' && json.hata);
  if (msg) return msg;
  return `${fallback} HTTP ${status}`;
}

export function isNesSuccessStatus(status: number, json: Record<string, unknown>): boolean {
  if (status >= 400) return false;
  if (json.success === false || json.ok === false) return false;
  if (typeof json.error === 'string' && json.error && !json.access_token) return false;
  return true;
}
