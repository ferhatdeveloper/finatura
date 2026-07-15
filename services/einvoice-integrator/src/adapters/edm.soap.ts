import { randomUUID } from 'node:crypto';
import type { ProviderCredentials } from '../config.js';
import type { ApproveOptions, InvoiceDraftPayload } from './types.js';
import {
  escapeXml,
  extractXmlAttr,
  extractXmlTag,
  isSoapFault,
  soapFaultMessage,
  ublToBase64,
} from './soapXml.js';

/**
 * EDM Bilişim EFaturaEDM SOAP zarfı iskeleti (WCF / tempuri.org).
 * Gerçek WSDL alan adları bayilik ortamına göre ince ayarlanabilir.
 * @see https://docs.edmbilisim.com.tr/
 */

export { extractXmlTag, extractXmlAttr, isSoapFault, soapFaultMessage };

export function soapEnvelope(bodyXml: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<s:Body>${bodyXml}</s:Body>` +
    `</s:Envelope>`
  );
}

function requestHeaderXml(sessionId: string): string {
  const txn = randomUUID();
  const actionDate = new Date().toISOString();
  return (
    `<REQUEST_HEADER xmlns="">` +
    `<SESSION_ID>${escapeXml(sessionId)}</SESSION_ID>` +
    `<CLIENT_TXN_ID>${escapeXml(txn)}</CLIENT_TXN_ID>` +
    `<ACTION_DATE>${escapeXml(actionDate)}</ACTION_DATE>` +
    `<REASON>Finatura e-Fatura entegrasyonu</REASON>` +
    `<APPLICATION_NAME>Finatura</APPLICATION_NAME>` +
    `<HOSTNAME>finatura</HOSTNAME>` +
    `<CHANNEL_NAME>FINATURA</CHANNEL_NAME>` +
    `<COMPRESSED>N</COMPRESSED>` +
    `</REQUEST_HEADER>`
  );
}

function aliasOr(
  metadata: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
): string {
  const v = metadata?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

export function buildLoginSoap(credentials: ProviderCredentials): string {
  const inner =
    `<LoginRequest xmlns="http://tempuri.org/">` +
    requestHeaderXml('0') +
    `<USER_NAME xmlns="">${escapeXml(credentials.username)}</USER_NAME>` +
    `<PASSWORD xmlns="">${escapeXml(credentials.password)}</PASSWORD>` +
    `</LoginRequest>`;
  return soapEnvelope(inner);
}

export function buildSendInvoiceSoap(
  sessionId: string,
  credentials: ProviderCredentials,
  payload: InvoiceDraftPayload,
  ettn: string,
): string {
  const ubl =
    payload.ublXml?.trim() ||
    `<!-- Finatura EDM skeleton UBL ettn=${ettn} kind=${payload.kind} -->`;
  const content = ublToBase64(ubl);
  const senderVkn = credentials.vkn || payload.senderVkn;
  const gb = aliasOr(
    payload.metadata,
    'senderAlias',
    process.env.EDM_GB_ALIAS?.trim() ||
      `urn:mail:defaultgb@${senderVkn || 'finatura'}.local`,
  );
  const pk = aliasOr(
    payload.metadata,
    'receiverAlias',
    process.env.EDM_PK_ALIAS?.trim() ||
      `urn:mail:defaultpk@${payload.receiverVknOrTckn}.local`,
  );
  const isEarsiv = payload.kind === 'earsiv';

  const inner =
    `<SendInvoiceRequest xmlns="http://tempuri.org/">` +
    requestHeaderXml(sessionId) +
    `<SENDER xmlns="" vkn="${escapeXml(senderVkn)}" alias="${escapeXml(gb)}"/>` +
    `<RECEIVER xmlns="" vkn="${escapeXml(payload.receiverVknOrTckn)}" alias="${escapeXml(pk)}"/>` +
    `<INVOICE TRXID="0" UUID="${escapeXml(ettn)}"${
      payload.documentNumber ? ` ID="${escapeXml(payload.documentNumber)}"` : ''
    } xmlns="">` +
    `<HEADER>` +
    `<SENDER>${escapeXml(senderVkn)}</SENDER>` +
    `<RECEIVER>${escapeXml(payload.receiverVknOrTckn)}</RECEIVER>` +
    `<FROM>${escapeXml(gb)}</FROM>` +
    `<TO>${escapeXml(pk)}</TO>` +
    `<INTERNETSALES>false</INTERNETSALES>` +
    `<EARCHIVE>${isEarsiv ? 'true' : 'false'}</EARCHIVE>` +
    `</HEADER>` +
    `<CONTENT>${content}</CONTENT>` +
    `</INVOICE>` +
    `</SendInvoiceRequest>`;

  return soapEnvelope(inner);
}

/** Ticari fatura uygulama yanıtı (kabul/red) iskeleti */
export function buildApproveSoap(
  sessionId: string,
  ettn: string,
  options?: ApproveOptions,
): string {
  const accept = options?.accept !== false;
  const responseCode = accept ? 'KABUL' : 'RED';
  const reason = options?.reason ? escapeXml(options.reason) : '';

  const inner =
    `<SendInvoiceResponseRequest xmlns="http://tempuri.org/">` +
    requestHeaderXml(sessionId) +
    `<INVOICE xmlns="" UUID="${escapeXml(ettn)}">` +
    `<HEADER>` +
    `<STATUS>${escapeXml(responseCode)}</STATUS>` +
    `<STATUS_DESCRIPTION>${escapeXml(responseCode)}</STATUS_DESCRIPTION>` +
    (reason ? `<RESPONSE_DESCRIPTION>${reason}</RESPONSE_DESCRIPTION>` : '') +
    `</HEADER>` +
    `</INVOICE>` +
    `</SendInvoiceResponseRequest>`;

  return soapEnvelope(inner);
}

export function buildGetStatusSoap(sessionId: string, ettn: string): string {
  const inner =
    `<GetInvoiceStatusRequest xmlns="http://tempuri.org/">` +
    requestHeaderXml(sessionId) +
    `<INVOICE TRXID="0" UUID="${escapeXml(ettn)}" xmlns=""/>` +
    `</GetInvoiceStatusRequest>`;
  return soapEnvelope(inner);
}

/** PDF: GetInvoiceWithType TYPE=PDF */
export function buildGetPdfSoap(sessionId: string, ettn: string): string {
  const inner =
    `<GetInvoiceWithTypeRequest xmlns="http://tempuri.org/">` +
    requestHeaderXml(sessionId) +
    `<INVOICE_SEARCH_KEY xmlns="">` +
    `<UUID>${escapeXml(ettn)}</UUID>` +
    `<TYPE>PDF</TYPE>` +
    `<DIRECTION>OUT</DIRECTION>` +
    `</INVOICE_SEARCH_KEY>` +
    `<HEADER_ONLY>0</HEADER_ONLY>` +
    `<INVOICE_CONTENT_TYPE>PDF</INVOICE_CONTENT_TYPE>` +
    `</GetInvoiceWithTypeRequest>`;
  return soapEnvelope(inner);
}

export function parseSessionId(loginResponseXml: string): string | undefined {
  return extractXmlTag(loginResponseXml, 'SESSION_ID');
}

export function isEdmReturnOk(xml: string): boolean {
  const code = extractXmlTag(xml, 'RETURN_CODE');
  if (code === undefined) return !isSoapFault(xml);
  return code === '0';
}
