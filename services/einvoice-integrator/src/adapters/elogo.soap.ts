import type { ProviderCredentials } from '../config.js';
import type { ApproveOptions, InvoiceDraftPayload } from './types.js';
import {
  escapeXml,
  extractXmlTag,
  isSoapFault,
  soapFaultMessage,
  zipSingleFileBase64,
} from './soapXml.js';

/**
 * Logo eLogo PostBoxService SOAP zarfı iskeleti.
 * Test: https://betatest.elogo.com.tr/webservice/PostBoxService.svc
 * Prod bayilik endpoint'i ELOGO_BASE_URL ile verilir.
 * @see PostBoxService (Login → sessionID → SendDocument / GetDocument*)
 */

export { extractXmlTag, isSoapFault, soapFaultMessage };

const ELOGO_DCO =
  'http://schemas.datacontract.org/2004/07/eFaturaWebService';

export function soapEnvelope(bodyXml: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:tem="http://tempuri.org/" ` +
    `xmlns:efat="${ELOGO_DCO}">` +
    `<soap:Header/>` +
    `<soap:Body>${bodyXml}</soap:Body>` +
    `</soap:Envelope>`
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
    `<tem:Login>` +
    `<tem:login>` +
    `<efat:userName>${escapeXml(credentials.username)}</efat:userName>` +
    `<efat:passWord>${escapeXml(credentials.password)}</efat:passWord>` +
    `<efat:appStr>Finatura</efat:appStr>` +
    `<efat:source>Finatura</efat:source>` +
    `<efat:version>1.0</efat:version>` +
    `</tem:login>` +
    `</tem:Login>`;
  return soapEnvelope(inner);
}

/** UBL → zip+base64 (eLogo document binaryData) */
export function buildSendDocumentSoap(
  sessionId: string,
  credentials: ProviderCredentials,
  payload: InvoiceDraftPayload,
  ettn: string,
): string {
  const ubl =
    payload.ublXml?.trim() ||
    `<!-- Finatura eLogo skeleton UBL ettn=${ettn} kind=${payload.kind} -->`;
  const binary = zipSingleFileBase64(`${ettn}.xml`, ubl);
  const vkn = credentials.vkn || payload.senderVkn;
  const gb = aliasOr(
    payload.metadata,
    'senderAlias',
    process.env.ELOGO_GB_ALIAS?.trim() ||
      `urn:mail:defaultgb@${vkn || 'finatura'}.elogo.local`,
  );
  const pk = aliasOr(
    payload.metadata,
    'receiverAlias',
    process.env.ELOGO_PK_ALIAS?.trim() ||
      `urn:mail:defaultpk@${payload.receiverVknOrTckn}.elogo.local`,
  );
  const docType = payload.kind === 'earsiv' ? 'EARCHIVE' : 'EINVOICE';

  const inner =
    `<tem:SendDocument>` +
    `<tem:sessionID>${escapeXml(sessionId)}</tem:sessionID>` +
    `<tem:document>` +
    `<efat:binaryData>${binary}</efat:binaryData>` +
    `<efat:currentDate>${escapeXml(payload.issueDate)}</efat:currentDate>` +
    `<efat:documentType>${escapeXml(docType)}</efat:documentType>` +
    `<efat:fileName>${escapeXml(ettn)}.xml</efat:fileName>` +
    `<efat:uuid>${escapeXml(ettn)}</efat:uuid>` +
    (payload.documentNumber
      ? `<efat:documentNumber>${escapeXml(payload.documentNumber)}</efat:documentNumber>`
      : '') +
    `<efat:vknTckn>${escapeXml(vkn)}</efat:vknTckn>` +
    `<efat:alias>${escapeXml(gb)}</efat:alias>` +
    `<efat:receiverAlias>${escapeXml(pk)}</efat:receiverAlias>` +
    `<efat:receiverVknTckn>${escapeXml(payload.receiverVknOrTckn)}</efat:receiverVknTckn>` +
    `</tem:document>` +
    `</tem:SendDocument>`;

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
  const reason = options?.reason ?? (accept ? 'Kabul' : 'Red');
  const appResp =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ApplicationResponse>` +
    `<UUID>${escapeXml(ettn)}</UUID>` +
    `<ResponseCode>${escapeXml(responseCode)}</ResponseCode>` +
    `<Description>${escapeXml(reason)}</Description>` +
    `</ApplicationResponse>`;
  const binary = zipSingleFileBase64(`${ettn}-appresp.xml`, appResp);

  const inner =
    `<tem:SendDocument>` +
    `<tem:sessionID>${escapeXml(sessionId)}</tem:sessionID>` +
    `<tem:document>` +
    `<efat:binaryData>${binary}</efat:binaryData>` +
    `<efat:documentType>APP_RESP</efat:documentType>` +
    `<efat:fileName>${escapeXml(ettn)}-appresp.xml</efat:fileName>` +
    `<efat:uuid>${escapeXml(ettn)}</efat:uuid>` +
    `</tem:document>` +
    `</tem:SendDocument>`;

  return soapEnvelope(inner);
}

export function buildGetDocumentDataSoap(
  sessionId: string,
  ettn: string,
): string {
  const inner =
    `<tem:GetDocumentData>` +
    `<tem:sessionID>${escapeXml(sessionId)}</tem:sessionID>` +
    `<tem:uuid>${escapeXml(ettn)}</tem:uuid>` +
    `<tem:dataType>PDF</tem:dataType>` +
    `</tem:GetDocumentData>`;
  return soapEnvelope(inner);
}

export function buildGetDocumentStatusSoap(
  sessionId: string,
  ettn: string,
): string {
  const inner =
    `<tem:GetDocumentStatus>` +
    `<tem:sessionID>${escapeXml(sessionId)}</tem:sessionID>` +
    `<tem:uuid>${escapeXml(ettn)}</tem:uuid>` +
    `</tem:GetDocumentStatus>`;
  return soapEnvelope(inner);
}

export function parseSessionId(loginResponseXml: string): string | undefined {
  return (
    extractXmlTag(loginResponseXml, 'sessionID') ||
    extractXmlTag(loginResponseXml, 'SessionID') ||
    extractXmlTag(loginResponseXml, 'sessionId')
  );
}

/** LoginResponse: LoginResult=true ve sessionID dolu olmalı */
export function isElogoLoginOk(xml: string): boolean {
  const result =
    extractXmlTag(xml, 'LoginResult') ||
    extractXmlTag(xml, 'loginResult');
  if (result !== undefined && /false|0/i.test(result)) return false;
  const sid = parseSessionId(xml);
  return Boolean(sid);
}
