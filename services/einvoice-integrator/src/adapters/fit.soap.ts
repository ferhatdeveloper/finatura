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
 * FIT (Foriba / Sovos / Logo) ClientEInvoiceServices SOAP zarfı iskeleti.
 * Gerçek WSDL alan adları bayilik ortamına göre ince ayarlanabilir.
 */

export { extractXmlTag, isSoapFault, soapFaultMessage };

export function soapEnvelope(bodyXml: string, withWsse?: { user: string; pass: string }): string {
  const header = withWsse
    ? `<soap:Header>` +
      `<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">` +
      `<wsse:UsernameToken>` +
      `<wsse:Username>${escapeXml(withWsse.user)}</wsse:Username>` +
      `<wsse:Password>${escapeXml(withWsse.pass)}</wsse:Password>` +
      `</wsse:UsernameToken>` +
      `</wsse:Security>` +
      `</soap:Header>`
    : `<soap:Header/>`;

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:fit="http://fitcons.com/eInvoice/">` +
    header +
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

function authCredentials(credentials: ProviderCredentials): { user: string; pass: string } {
  return { user: credentials.username, pass: credentials.password };
}

export function buildSendUblSoap(
  credentials: ProviderCredentials,
  payload: InvoiceDraftPayload,
  ettn: string,
): string {
  const ubl =
    payload.ublXml?.trim() ||
    `<!-- Finatura FIT skeleton UBL ettn=${ettn} kind=${payload.kind} -->`;
  const docData = zipSingleFileBase64(`${ettn}.xml`, ubl);
  const vkn = credentials.vkn || payload.senderVkn;
  const senderId = aliasOr(
    payload.metadata,
    'senderAlias',
    process.env.FIT_GB_ALIAS?.trim() ||
      `urn:mail:defaultgb@${vkn || 'finatura'}.fit.local`,
  );
  const receiverId = aliasOr(
    payload.metadata,
    'receiverAlias',
    process.env.FIT_PK_ALIAS?.trim() ||
      `urn:mail:defaultpk@${payload.receiverVknOrTckn}.fit.local`,
  );

  const inner =
    `<fit:SendUBL>` +
    `<fit:VKNTCKN>${escapeXml(vkn)}</fit:VKNTCKN>` +
    `<fit:SenderIdentifier>${escapeXml(senderId)}</fit:SenderIdentifier>` +
    `<fit:ReceiverIdentifier>${escapeXml(receiverId)}</fit:ReceiverIdentifier>` +
    `<fit:DocType>INVOICE</fit:DocType>` +
    `<fit:DocData>${docData}</fit:DocData>` +
    `</fit:SendUBL>`;

  return soapEnvelope(inner, authCredentials(credentials));
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
  const docData = zipSingleFileBase64(`${ettn}-appresp.xml`, appResp);
  const vkn = credentials.vkn || '';

  const inner =
    `<fit:SendUBL>` +
    `<fit:VKNTCKN>${escapeXml(vkn)}</fit:VKNTCKN>` +
    `<fit:SenderIdentifier>${escapeXml(
      process.env.FIT_GB_ALIAS?.trim() || `urn:mail:defaultgb@${vkn || 'finatura'}.fit.local`,
    )}</fit:SenderIdentifier>` +
    `<fit:ReceiverIdentifier>${escapeXml(
      process.env.FIT_PK_ALIAS?.trim() || `urn:mail:defaultpk@gib.fit.local`,
    )}</fit:ReceiverIdentifier>` +
    `<fit:DocType>APP_RESP</fit:DocType>` +
    `<fit:DocData>${docData}</fit:DocData>` +
    `</fit:SendUBL>`;

  return soapEnvelope(inner, authCredentials(credentials));
}

export function buildGetInvoiceViewSoap(
  credentials: ProviderCredentials,
  ettn: string,
): string {
  const vkn = credentials.vkn || '';
  const identifier =
    process.env.FIT_GB_ALIAS?.trim() ||
    `urn:mail:defaultgb@${vkn || 'finatura'}.fit.local`;

  const inner =
    `<fit:GetInvoiceView>` +
    `<fit:UUID>${escapeXml(ettn)}</fit:UUID>` +
    `<fit:Identifier>${escapeXml(identifier)}</fit:Identifier>` +
    `<fit:VKNTCKN>${escapeXml(vkn)}</fit:VKNTCKN>` +
    `<fit:Type>INVOICE</fit:Type>` +
    `<fit:DocType>PDF</fit:DocType>` +
    `</fit:GetInvoiceView>`;

  return soapEnvelope(inner, authCredentials(credentials));
}

export function buildGetStatusSoap(
  credentials: ProviderCredentials,
  ettn: string,
): string {
  const vkn = credentials.vkn || '';
  const identifier =
    process.env.FIT_GB_ALIAS?.trim() ||
    `urn:mail:defaultgb@${vkn || 'finatura'}.fit.local`;

  const inner =
    `<fit:GetEnvelopeStatus>` +
    `<fit:UUID>${escapeXml(ettn)}</fit:UUID>` +
    `<fit:Identifier>${escapeXml(identifier)}</fit:Identifier>` +
    `<fit:VKNTCKN>${escapeXml(vkn)}</fit:VKNTCKN>` +
    `<fit:Parameters>DOC_DATA</fit:Parameters>` +
    `</fit:GetEnvelopeStatus>`;

  return soapEnvelope(inner, authCredentials(credentials));
}
