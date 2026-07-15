import type { BankTxDirection, FinteoTransaction } from '../types.js';

/**
 * Finteo yanıt gövdesinden hareket dizisini çıkarır.
 * Resmi OpenAPI yok; yaygın sarmalayıcı / alan adları desteklenir.
 */
export function extractTransactionArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];

  const obj = body as Record<string, unknown>;
  for (const key of ['data', 'transactions', 'items', 'results', 'content']) {
    const val = obj[key];
    if (Array.isArray(val)) return val;
  }

  // { data: { transactions: [...] } }
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const nested = obj.data as Record<string, unknown>;
    for (const key of ['transactions', 'items', 'results']) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
    }
  }

  return [];
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.abs(v);
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number.parseFloat(v.replace(',', '.'));
      if (Number.isFinite(n)) return Math.abs(n);
    }
  }
  return null;
}

function pickDate(obj: Record<string, unknown>, keys: string[]): Date | null {
  for (const key of keys) {
    const v = obj[key];
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function mapDirection(raw: unknown, amountHint?: number): BankTxDirection | null {
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (['inbound', 'in', 'credit', 'alacak', 'gelen', 'cr', 'c'].includes(s)) return 'inbound';
    if (['outbound', 'out', 'debit', 'borc', 'borç', 'giden', 'dr', 'd'].includes(s)) {
      return 'outbound';
    }
  }
  if (typeof amountHint === 'number') {
    if (amountHint > 0) return 'inbound';
    if (amountHint < 0) return 'outbound';
  }
  return null;
}

export interface MapTransactionContext {
  fallbackAccountRef?: string;
}

/**
 * Tek ham kaydı FinteoTransaction'a çevirir. Zorunlu alanlar yoksa null.
 */
export function mapRawTransaction(
  raw: unknown,
  ctx: MapTransactionContext = {},
): FinteoTransaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const providerTxId = pickString(obj, [
    'providerTxId',
    'provider_tx_id',
    'transactionId',
    'transaction_id',
    'txId',
    'tx_id',
    'id',
    'uuid',
    'reference',
    'ref',
  ]);
  if (!providerTxId) return null;

  const signedAmount = (() => {
    for (const key of ['amount', 'tutar', 'value', 'transactionAmount']) {
      const v = obj[key];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number.parseFloat(v.replace(',', '.'));
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  })();

  const amount = pickNumber(obj, ['amount', 'tutar', 'value', 'transactionAmount']);
  if (amount === null || amount <= 0) return null;

  const direction =
    mapDirection(
      obj.direction ?? obj.type ?? obj.creditDebitIndicator ?? obj.side ?? obj.hareketTipi,
      signedAmount ?? undefined,
    ) ?? 'inbound';

  const transactionAt =
    pickDate(obj, [
      'transactionAt',
      'transaction_at',
      'bookingDate',
      'booking_date',
      'valueDate',
      'value_date',
      'date',
      'transactionDate',
      'transaction_date',
      'createdAt',
      'created_at',
    ]) ?? new Date();

  const valueDateRaw = pickString(obj, ['valueDate', 'value_date', 'valor']);
  let valueDate: string | null = null;
  if (valueDateRaw) {
    const d = new Date(valueDateRaw);
    valueDate = Number.isNaN(d.getTime())
      ? valueDateRaw.slice(0, 10)
      : d.toISOString().slice(0, 10);
  }

  const providerAccountRef =
    pickString(obj, [
      'providerAccountRef',
      'provider_account_ref',
      'accountRef',
      'account_ref',
      'accountId',
      'account_id',
      'iban',
    ]) ?? ctx.fallbackAccountRef ?? 'default';

  const currencyCode = (
    pickString(obj, ['currencyCode', 'currency_code', 'currency', 'ccy']) ?? 'TRY'
  ).toUpperCase();

  return {
    providerTxId,
    providerAccountRef,
    direction,
    amount,
    currencyCode: currencyCode.slice(0, 3),
    transactionAt,
    valueDate,
    counterpartyName: pickString(obj, [
      'counterpartyName',
      'counterparty_name',
      'counterpartName',
      'senderName',
      'receiverName',
      'gonderen',
      'alici',
      'name',
    ]),
    counterpartyIban: pickString(obj, [
      'counterpartyIban',
      'counterparty_iban',
      'counterpartIban',
      'iban',
      'counterpartyAccount',
    ]),
    description: pickString(obj, [
      'description',
      'aciklama',
      'narrative',
      'remark',
      'details',
      'explanation',
    ]),
    rawPayload: { source: 'finteo-http', original: obj },
  };
}

export function mapFinteoResponse(
  body: unknown,
  ctx: MapTransactionContext = {},
): FinteoTransaction[] {
  const rows = extractTransactionArray(body);
  const mapped: FinteoTransaction[] = [];
  for (const row of rows) {
    const tx = mapRawTransaction(row, ctx);
    if (tx) mapped.push(tx);
  }
  return mapped;
}
