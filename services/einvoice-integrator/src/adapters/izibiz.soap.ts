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
 * İzibiz AuthenticationWS + EInvoiceWS SOAP zarfı iskeleti.
 * Namespace: http://schemas.i2i.com/ei/wsdl
 * Gerçek WSDL alan adları bayilik ortamına göre ince ayarlanabilir.
 * @see https://dev.izibiz.com.tr/
 */

export { extractXmlTag, extractXmlAttr, isSoapFault, soapFaultMessage };

const NS = 'http://schemas.i2i.com/ei/wsdl';

export function soapEnvelope(bodyXml: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:wsdl="${NS}">` +
    `<soap:Body>${bodyXml}</soap:Body>` +
    `</soap:Envelope>`
  );
}

function requestHeaderXml(sessionId: string, compressed = 'N'): string {
  return (
    `<REQUEST_HEADER>` +
    `<SESSION_ID>${escapeXml(sessionId)}</SESSION_ID>` +
    `<APPLICATION_NAME>Finatura</APPLICATION_NAME>` +
    `<COMPRESSED>${escapeXml(compressed)}</COMPRESSED>` +
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
    `<wsdl:LoginRequest>` +
    requestHeaderXml('-1') +
    `<USER_NAME>${escapeXml(credentials.username)}</USER_NAME>` +
    `<PASSWORD>${escapeXml(credentials.password)}</PASSWORD>` +
    `</wsdl:LoginRequest>`;
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
    `<!-- Finatura İzibiz skeleton UBL ettn=${ettn} kind=${payload.kind} -->`;
  const content = ublToBase64(ubl);
  const senderVkn = credentials.vkn || payload.senderVkn;
  const gb = aliasOr(
    payload.metadata,
    'senderAlias',
    process.env.IZIBIZ_GB_ALIAS?.trim() ||
      `urn:mail:defaultgb@${senderVkn || 'finatura'}.izibiz.local`,
  );
  const pk = aliasOr(
    payload.metadata,
    'receiverAlias',
    process.env.IZIBIZ_PK_ALIAS?.trim() ||
      `urn:mail:defaultpk@${payload.receiverVknOrTckn}.izibiz.local`,
  );

  const inner =
    `<wsdl:SendInvoiceRequest>` +
    requestHeaderXml(sessionId, 'N') +
    `<SENDER vkn="${escapeXml(senderVkn)}" alias="${escapeXml(gb)}"/>` +
    `<RECEIVER vkn="${escapeXml(payload.receiverVknOrTckn)}" alias="${escapeXml(pk)}"/>` +
    `<INVOICE UUID="${escapeXml(ettn)}"${
      payload.documentNumber ? ` ID="${escapeXml(payload.documentNumber)}"` : ''
    }>` +
    `<CONTENT>${content}</CONTENT>` +
    `</INVOICE>` +
    `</wsdl:SendInvoiceRequest>`;

  return soapEnvelope(inner);
}

/** Ticari fatura uygulama yanıtı — SendInvoiceResponseWithServerSign */
export function buildApproveSoap(
  sessionId: string,
  ettn: string,
  options?: ApproveOptions,
): string {
  const accept = options?.accept !== false;
  const status = accept ? 'KABUL' : 'RED';
  const description =
    options?.reason ?? (accept ? 'Fatura kabul edildi' : 'Reddedildi');

  const inner =
    `<wsdl:SendInvoiceResponseWithServerSignRequest>` +
    requestHeaderXml(sessionId) +
    `<STATUS>${escapeXml(status)}</STATUS>` +
    `<INVOICE UUID="${escapeXml(ettn)}"/>` +
    `<DESCRIPTION>${escapeXml(description)}</DESCRIPTION>` +
    `</wsdl:SendInvoiceResponseWithServerSignRequest>`;

  return soapEnvelope(inner);
}

export function buildGetStatusSoap(sessionId: string, ettn: string): string {
  const inner =
    `<wsdl:GetInvoiceStatusRequest>` +
    requestHeaderXml(sessionId) +
    `<INVOICE UUID="${escapeXml(ettn)}"/>` +
    `</wsdl:GetInvoiceStatusRequest>`;
  return soapEnvelope(inner);
}

/** PDF: GetInvoiceWithType TYPE=PDF, DIRECTION=OUT */
export function buildGetPdfSoap(sessionId: string, ettn: string): string {
  const inner =
    `<wsdl:GetInvoiceWithTypeRequest>` +
    requestHeaderXml(sessionId) +
    `<SEARCH_KEY>` +
    `<UUID>${escapeXml(ettn)}</UUID>` +
    `<TYPE>PDF</TYPE>` +
    `<DIRECTION>OUT</DIRECTION>` +
    `</SEARCH_KEY>` +
    `<HEADER_ONLY>N</HEADER_ONLY>` +
    `</wsdl:GetInvoiceWithTypeRequest>`;
  return soapEnvelope(inner);
}

export function parseSessionId(loginResponseXml: string): string | undefined {
  return extractXmlTag(loginResponseXml, 'SESSION_ID');
}

export function isIzibizReturnOk(xml: string): boolean {
  if (/ERROR_TYPE/i.test(xml) && /ERROR_CODE/i.test(xml)) return false;
  const code = extractXmlTag(xml, 'RETURN_CODE');
  if (code === undefined) return !isSoapFault(xml);
  return code === '0';
}

export function izibizErrorMessage(xml: string, fallback = 'İzibiz hata'): string {
  return (
    extractXmlTag(xml, 'ERROR_SHORT_DES') ||
    extractXmlTag(xml, 'ERROR_SHORT_DESC') ||
    extractXmlTag(xml, 'ERROR_LONG_DES') ||
    extractXmlTag(xml, 'ERROR_LONG_DESC') ||
    soapFaultMessage(xml, fallback)
  );
}
