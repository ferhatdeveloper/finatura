import type { ProviderCredentials } from '../config.js';
import type { ApproveOptions, InvoiceDraftPayload } from './types.js';

/**
 * Uyumsoft BasicIntegration SOAP zarfı iskeleti.
 * Gerçek WSDL alan adları ortam/versiyona göre ince ayarlanabilir;
 * burada HTTP taşıma + kimlik bilgisi + UBL gövdesi bağlanır.
 */
export function soapEnvelope(bodyXml: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:tem="http://tempuri.org/">` +
    `<soap:Header/>` +
    `<soap:Body>${bodyXml}</soap:Body>` +
    `</soap:Envelope>`
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function userInfoXml(credentials: ProviderCredentials): string {
  return (
    `<tem:userInfo>` +
    `<tem:Username>${escapeXml(credentials.username)}</tem:Username>` +
    `<tem:Password>${escapeXml(credentials.password)}</tem:Password>` +
    `</tem:userInfo>`
  );
}

/** UBL XML → base64 (Uyumsoft InvoiceRawData) */
export function ublToBase64(ublXml: string): string {
  return Buffer.from(ublXml, 'utf8').toString('base64');
}

export function buildSendInvoiceSoap(
  credentials: ProviderCredentials,
  payload: InvoiceDraftPayload,
  ettn: string,
): string {
  const ubl =
    payload.ublXml?.trim() ||
    `<!-- Finatura skeleton UBL placeholder ettn=${ettn} kind=${payload.kind} -->`;
  const raw = ublToBase64(ubl);

  const inner =
    `<tem:SendInvoice>` +
    userInfoXml(credentials) +
    `<tem:invoices>` +
    `<tem:InvoiceInfo>` +
    `<tem:Invoice>` +
    `<tem:UUID>${escapeXml(ettn)}</tem:UUID>` +
    (payload.documentNumber
      ? `<tem:InvoiceNumber>${escapeXml(payload.documentNumber)}</tem:InvoiceNumber>`
      : '') +
    `<tem:InvoiceRawData>${raw}</tem:InvoiceRawData>` +
    `<tem:TargetCustomer>` +
    `<tem:VknTckn>${escapeXml(payload.receiverVknOrTckn)}</tem:VknTckn>` +
    `<tem:Title>${escapeXml(payload.receiverTitle)}</tem:Title>` +
    `</tem:TargetCustomer>` +
    `</tem:Invoice>` +
    `</tem:InvoiceInfo>` +
    `</tem:invoices>` +
    `</tem:SendInvoice>`;

  return soapEnvelope(inner);
}

export function buildGetStatusSoap(
  credentials: ProviderCredentials,
  ettn: string,
): string {
  const inner =
    `<tem:GetInvoiceStatus>` +
    userInfoXml(credentials) +
    `<tem:invoiceIds>` +
    `<tem:string>${escapeXml(ettn)}</tem:string>` +
    `</tem:invoiceIds>` +
    `</tem:GetInvoiceStatus>`;
  return soapEnvelope(inner);
}

export function buildApproveSoap(
  credentials: ProviderCredentials,
  ettn: string,
  options?: ApproveOptions,
): string {
  const accept = options?.accept !== false;
  const action = accept ? 'AcceptInvoice' : 'RejectInvoice';
  const reason = options?.reason ? escapeXml(options.reason) : '';

  const inner =
    `<tem:${action}>` +
    userInfoXml(credentials) +
    `<tem:invoiceIds>` +
    `<tem:string>${escapeXml(ettn)}</tem:string>` +
    `</tem:invoiceIds>` +
    (reason ? `<tem:reason>${reason}</tem:reason>` : '') +
    `</tem:${action}>`;

  return soapEnvelope(inner);
}

export function buildGetPdfSoap(
  credentials: ProviderCredentials,
  ettn: string,
): string {
  const inner =
    `<tem:GetOutboxInvoicePdf>` +
    userInfoXml(credentials) +
    `<tem:invoiceId>${escapeXml(ettn)}</tem:invoiceId>` +
    `</tem:GetOutboxInvoicePdf>`;
  return soapEnvelope(inner);
}

/** SOAP yanıtından basit alan çıkarımı (iskelet) */
export function extractXmlTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, 'i');
  const m = xml.match(re);
  return m?.[1]?.trim();
}

export function isSoapFault(xml: string): boolean {
  return /Fault/i.test(xml) && /faultstring|FaultString/i.test(xml);
}

export function soapFaultMessage(xml: string): string {
  return (
    extractXmlTag(xml, 'faultstring') ||
    extractXmlTag(xml, 'FaultString') ||
    extractXmlTag(xml, 'Message') ||
    'Uyumsoft SOAP Fault'
  );
}
