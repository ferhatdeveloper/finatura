import type { ProviderCredentials } from '../config.js';
import type { ApproveOptions, InvoiceDraftPayload, InvoiceKind } from './types.js';
import { zipSingleFileBase64 } from './soapXml.js';

/**
 * Nilvera e-Fatura / e-Arşiv REST iskeleti.
 * Auth: Authorization: Bearer {API_KEY}
 * Dokümantasyon: https://developer.nilvera.com / https://apitest.nilvera.com
 */

export type NilveraServiceRoot = 'einvoice' | 'earchive';

export function serviceRootForKind(kind: InvoiceKind): NilveraServiceRoot {
  return kind === 'earsiv' ? 'earchive' : 'einvoice';
}

export function resolveNilveraToken(credentials: ProviderCredentials): string {
  return (
    credentials.apiKey?.trim() ||
    credentials.password?.trim() ||
    credentials.username?.trim() ||
    ''
  );
}

export function nilveraAuthHeader(credentials: ProviderCredentials): string {
  return `Bearer ${resolveNilveraToken(credentials)}`;
}

function aliasOr(
  metadata: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
): string {
  const v = metadata?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

export function buildSendBase64Body(
  credentials: ProviderCredentials,
  payload: InvoiceDraftPayload,
  ettn: string,
): { ZIPFileBase64: string; Alias: string; TemplateUUID?: string } {
  const ubl =
    payload.ublXml?.trim() ||
    `<!-- Finatura Nilvera skeleton UBL ettn=${ettn} kind=${payload.kind} -->`;
  const zipB64 = zipSingleFileBase64(`${ettn}.xml`, ubl);
  const alias = aliasOr(
    payload.metadata,
    'receiverAlias',
    process.env.NILVERA_PK_ALIAS?.trim() ||
      `urn:mail:defaultpk@${payload.receiverVknOrTckn}.nilvera.local`,
  );
  const template =
    aliasOr(payload.metadata, 'templateUuid', '') ||
    process.env.NILVERA_TEMPLATE_UUID?.trim() ||
    '';

  const body: { ZIPFileBase64: string; Alias: string; TemplateUUID?: string } = {
    ZIPFileBase64: zipB64,
    Alias: alias,
  };
  if (template) body.TemplateUUID = template;

  void credentials;
  return body;
}

export function buildSendAnswerBody(
  ettn: string,
  options?: ApproveOptions,
): { UUID: string; AnswerCode: 'approved' | 'rejected'; RejectNote?: string } {
  const accept = options?.accept !== false;
  return {
    UUID: ettn,
    AnswerCode: accept ? 'approved' : 'rejected',
    RejectNote: options?.reason ?? (accept ? undefined : 'RED'),
  };
}

export function parseJsonObject(body: string): Record<string, unknown> | undefined {
  const trimmed = body?.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function extractSendResponse(body: string): {
  uuid?: string;
  invoiceNumber?: string;
} {
  const obj = parseJsonObject(body);
  if (!obj) return {};
  const uuid =
    (typeof obj.UUID === 'string' && obj.UUID) ||
    (typeof obj.uuid === 'string' && obj.uuid) ||
    undefined;
  const invoiceNumber =
    (typeof obj.InvoiceNumber === 'string' && obj.InvoiceNumber) ||
    (typeof obj.invoiceNumber === 'string' && obj.invoiceNumber) ||
    undefined;
  return { uuid, invoiceNumber };
}

export function extractErrorMessage(body: string, fallback: string): string {
  const obj = parseJsonObject(body);
  if (obj) {
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
    if (typeof obj.Message === 'string' && obj.Message.trim()) return obj.Message;
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error;
    if (typeof obj.Detail === 'string' && obj.Detail.trim()) return obj.Detail;
  }
  if (Array.isArray(
    (() => {
      try {
        return JSON.parse(body) as unknown;
      } catch {
        return null;
      }
    })(),
  )) {
    const arr = JSON.parse(body) as unknown[];
    const parts = arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    if (parts.length) return parts.join('; ');
  }
  const trimmed = body?.trim();
  if (trimmed && trimmed.length < 500) return trimmed;
  return fallback;
}

export function extractPdfBase64(body: string, contentType?: string): string | undefined {
  const obj = parseJsonObject(body);
  if (obj) {
    for (const key of ['Content', 'content', 'Base64', 'base64', 'Data', 'data', 'Pdf', 'pdf']) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }

  const trimmed = body?.trim();
  if (!trimmed) return undefined;

  if (/^%PDF/i.test(trimmed)) {
    return Buffer.from(trimmed, 'binary').toString('base64');
  }

  if (/application\/pdf/i.test(contentType ?? '') && !trimmed.startsWith('{')) {
    return Buffer.from(body, 'binary').toString('base64');
  }

  // Saf base64 yanıtı (satır kırık olabilir)
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed) && trimmed.replace(/\s/g, '').length > 64) {
    return trimmed.replace(/\s/g, '');
  }

  return undefined;
}

export function mapNilveraStatus(body: string): {
  status: 'queued' | 'sent' | 'accepted' | 'rejected' | 'cancelled' | 'pending';
  detail?: string;
} {
  const obj = parseJsonObject(body);
  if (!obj) return { status: 'pending' };

  const answer = obj.Answer as Record<string, unknown> | undefined;
  const answerCode = String(answer?.AnswerCode ?? answer?.answerCode ?? '').toLowerCase();
  const invoiceStatus = obj.InvoiceStatus as Record<string, unknown> | undefined;
  const code = String(invoiceStatus?.Code ?? invoiceStatus?.code ?? '').toLowerCase();
  const description = String(
    invoiceStatus?.Description ?? invoiceStatus?.description ?? answer?.Description ?? '',
  );

  if (answerCode === 'approved' || answerCode === 'documentansweredautomatically') {
    return { status: 'accepted', detail: description || answerCode };
  }
  if (answerCode === 'rejected') {
    return { status: 'rejected', detail: description || answerCode };
  }
  if (answerCode === 'waitingforapproval') {
    return { status: 'queued', detail: description || answerCode };
  }
  if (code === 'succeed') return { status: 'sent', detail: description || code };
  if (code === 'waiting') return { status: 'queued', detail: description || code };
  if (code === 'error') return { status: 'pending', detail: description || code };

  return { status: 'pending', detail: description || code || answerCode || undefined };
}
