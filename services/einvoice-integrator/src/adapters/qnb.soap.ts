import { createHash } from 'node:crypto';
import type { ProviderCredentials } from '../config.js';
import type { ApproveOptions, InvoiceDraftPayload } from './types.js';
import {
  escapeXml,
  extractXmlTag,
  isSoapFault,
  soapFaultMessage,
  ublToBase64,
} from './soapXml.js';

/**
 * QNB eSolutions (eski eFinans / CS connector) SOAP zarfı iskeleti.
 * userService.wsLogin + connectorService belgeGonderExt / durum / indirme.
 * Gerçek WSDL alan adları bayilik ortamına göre ince ayarlanabilir.
 * @see https://www.qnbesolutions.com.tr/destek/api-teknik
 */

export { extractXmlTag, isSoapFault, soapFaultMessage };

const NS = 'http://service.csap.cs.com/';

export function soapEnvelope(bodyXml: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:ser="${NS}">` +
    `<soap:Header/>` +
    `<soap:Body>${bodyXml}</soap:Body>` +
    `</soap:Envelope>`
  );
}

function erpCode(metadata?: Record<string, unknown>): string {
  const fromMeta = metadata?.erpCode;
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
  return process.env.QNB_ERP_CODE?.trim() || 'FINATURA';
}

function md5Hex(content: string): string {
  return createHash('md5').update(content, 'utf8').digest('hex');
}

export function buildLoginSoap(credentials: ProviderCredentials): string {
  const inner =
    `<ser:wsLogin>` +
    `<userName>${escapeXml(credentials.username)}</userName>` +
    `<password>${escapeXml(credentials.password)}</password>` +
    `<lang>tr</lang>` +
    `</ser:wsLogin>`;
  return soapEnvelope(inner);
}

export function buildSendInvoiceSoap(
  credentials: ProviderCredentials,
  payload: InvoiceDraftPayload,
  ettn: string,
): string {
  const ubl =
    payload.ublXml?.trim() ||
    `<!-- Finatura QNB skeleton UBL ettn=${ettn} kind=${payload.kind} -->`;
  const veri = ublToBase64(ubl);
  const vkn = credentials.vkn || payload.senderVkn;
  const belgeTuru = payload.kind === 'earsiv' ? 'EARSV_UBL' : 'FATURA_UBL';

  const inner =
    `<ser:belgeGonderExt>` +
    `<parametreler>` +
    `<belgeNo>${escapeXml(ettn)}</belgeNo>` +
    `<vergiTcKimlikNo>${escapeXml(vkn)}</vergiTcKimlikNo>` +
    `<belgeTuru>${escapeXml(belgeTuru)}</belgeTuru>` +
    `<veri>${veri}</veri>` +
    `<belgeHash>${md5Hex(ubl)}</belgeHash>` +
    `<mimeType>application/xml</mimeType>` +
    `<belgeVersiyon>1.2</belgeVersiyon>` +
    `<erpKodu>${escapeXml(erpCode(payload.metadata))}</erpKodu>` +
    `</parametreler>` +
    `</ser:belgeGonderExt>`;

  return soapEnvelope(inner);
}

export function buildApproveSoap(
  credentials: ProviderCredentials,
  ettn: string,
  options?: ApproveOptions,
): string {
  const accept = options?.accept !== false;
  const responseCode = accept ? 'KABUL' : 'RED';
  const reason = options?.reason ?? (accept ? 'Kabul' : 'Red');
  const appResp =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ApplicationResponse>` +
    `<UUID>${escapeXml(ettn)}</UUID>` +
    `<ResponseCode>${escapeXml(responseCode)}</ResponseCode>` +
    `<Description>${escapeXml(reason)}</Description>` +
    `</ApplicationResponse>`;
  const veri = ublToBase64(appResp);
  const vkn = credentials.vkn || '';

  const inner =
    `<ser:belgeGonderExt>` +
    `<parametreler>` +
    `<belgeNo>${escapeXml(ettn)}</belgeNo>` +
    `<vergiTcKimlikNo>${escapeXml(vkn)}</vergiTcKimlikNo>` +
    `<belgeTuru>UYGULAMA_YANITI</belgeTuru>` +
    `<veri>${veri}</veri>` +
    `<belgeHash>${md5Hex(appResp)}</belgeHash>` +
    `<mimeType>application/xml</mimeType>` +
    `<belgeVersiyon>1.2</belgeVersiyon>` +
    `<erpKodu>${escapeXml(erpCode())}</erpKodu>` +
    `</parametreler>` +
    `</ser:belgeGonderExt>`;

  return soapEnvelope(inner);
}

export function buildGetPdfSoap(
  credentials: ProviderCredentials,
  ettn: string,
): string {
  const vkn = credentials.vkn || '';
  const inner =
    `<ser:gidenBelgeleriIndir>` +
    `<vergiTcKimlikNo>${escapeXml(vkn)}</vergiTcKimlikNo>` +
    `<belgeFormati>PDF</belgeFormati>` +
    `<belgeOidListesi>${escapeXml(ettn)}</belgeOidListesi>` +
    `<belgeTuru>FATURA</belgeTuru>` +
    `</ser:gidenBelgeleriIndir>`;
  return soapEnvelope(inner);
}

export function buildGetStatusSoap(
  credentials: ProviderCredentials,
  ettn: string,
): string {
  const vkn = credentials.vkn || '';
  const inner =
    `<ser:gidenBelgeDurumSorgulaExt>` +
    `<parametreler>` +
    `<vergiTcKimlikNo>${escapeXml(vkn)}</vergiTcKimlikNo>` +
    `<belgeTuru>FATURA</belgeTuru>` +
    `<ettn>${escapeXml(ettn)}</ettn>` +
    `</parametreler>` +
    `</ser:gidenBelgeDurumSorgulaExt>`;
  return soapEnvelope(inner);
}

/** Set-Cookie başlığından oturum çerezi (JSESSIONID vb.) */
export function parseSessionCookie(setCookieHeader: string | undefined): string | undefined {
  if (!setCookieHeader?.trim()) return undefined;
  const first = setCookieHeader.split(/,(?=[^;]+=[^;]+)/)[0] ?? setCookieHeader;
  const pair = first.split(';')[0]?.trim();
  return pair || undefined;
}
