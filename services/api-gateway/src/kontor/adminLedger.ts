import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { getCentralPool } from '../db/centralPool.js';
import { config } from '../config.js';

export type KontorLedgerType = 'credit' | 'debit' | 'adjust' | 'refund';

export interface KontorBalance {
  tenantId: string;
  balance: number;
  reserved: number;
  available: number;
  updatedAt: string | null;
}

export interface KontorLedgerEntry {
  id: string;
  tenantId: string;
  entryType: KontorLedgerType;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Stub (central DB yok) — süreç içi bakiye. */
const stubBalances = new Map<string, { balance: number; reserved: number }>();
const stubLedger = new Map<string, KontorLedgerEntry[]>();

function toNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (Number.isNaN(n)) throw new Error(`Geçersiz numeric: ${value}`);
  return n;
}

function useCentral(): boolean {
  return config.authProvider === 'central' && Boolean(config.centralDatabaseUrl);
}

export class AdminKontorError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
    readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AdminKontorError';
  }
}

export async function getKontorBalance(tenantId: string): Promise<KontorBalance> {
  if (!useCentral()) {
    const row = stubBalances.get(tenantId) ?? { balance: 0, reserved: 0 };
    return {
      tenantId,
      balance: row.balance,
      reserved: row.reserved,
      available: row.balance - row.reserved,
      updatedAt: null,
    };
  }

  const pool = getCentralPool();
  const result = await pool.query<{
    tenant_id: string;
    balance: string;
    reserved: string;
    updated_at: Date | null;
  }>(
    `SELECT tenant_id, balance, reserved, updated_at
     FROM public.tenant_kontor_balances WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!result.rows[0]) {
    return {
      tenantId,
      balance: 0,
      reserved: 0,
      available: 0,
      updatedAt: null,
    };
  }
  const balance = toNumber(result.rows[0].balance);
  const reserved = toNumber(result.rows[0].reserved);
  return {
    tenantId,
    balance,
    reserved,
    available: balance - reserved,
    updatedAt: result.rows[0].updated_at?.toISOString() ?? null,
  };
}

export async function listKontorLedger(
  tenantId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<KontorLedgerEntry[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  if (!useCentral()) {
    const items = stubLedger.get(tenantId) ?? [];
    return items.slice(offset, offset + limit);
  }

  const pool = getCentralPool();
  const result = await pool.query(
    `SELECT id, tenant_id, entry_type, amount, balance_after,
            reference_type, reference_id, description, created_by, created_at
     FROM public.kontor_ledger
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    entryType: row.entry_type as KontorLedgerType,
    amount: toNumber(row.amount),
    balanceAfter: toNumber(row.balance_after),
    referenceType: row.reference_type,
    referenceId: row.reference_id ? String(row.reference_id) : null,
    description: row.description,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

async function appendCentral(
  pool: Pool,
  input: {
    tenantId: string;
    entryType: KontorLedgerType;
    absoluteAmount: number;
    referenceType: string;
    referenceId: string;
    description: string | null;
    createdBy: string | null;
  },
): Promise<KontorLedgerEntry> {
  const delta =
    input.entryType === 'debit' ? -input.absoluteAmount : input.absoluteAmount;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO public.tenant_kontor_balances (tenant_id, balance, reserved)
       VALUES ($1, 0, 0) ON CONFLICT (tenant_id) DO NOTHING`,
      [input.tenantId],
    );

    const locked = await client.query<{
      balance: string;
      reserved: string;
    }>(
      `SELECT balance, reserved FROM public.tenant_kontor_balances
       WHERE tenant_id = $1 FOR UPDATE`,
      [input.tenantId],
    );
    const current = toNumber(locked.rows[0]!.balance);
    const reserved = toNumber(locked.rows[0]!.reserved);
    const available = current - reserved;
    const next = current + delta;

    if (input.entryType === 'debit' && available < input.absoluteAmount) {
      throw new AdminKontorError(
        `Yetersiz kontör (kullanılabilir: ${available}, istenen: ${input.absoluteAmount})`,
        'insufficient_kontor',
        402,
        { available, required: input.absoluteAmount },
      );
    }
    if (next < 0) {
      throw new AdminKontorError('Bakiye negatif olamaz', 'insufficient_kontor', 402);
    }
    if (reserved > next) {
      throw new AdminKontorError(
        'Rezerve kontör bakiyeyi aşıyor',
        'reserved_conflict',
        400,
      );
    }

    await client.query(
      `UPDATE public.tenant_kontor_balances
       SET balance = $2, updated_at = now() WHERE tenant_id = $1`,
      [input.tenantId, next],
    );

    const inserted = await client.query(
      `INSERT INTO public.kontor_ledger (
         tenant_id, entry_type, amount, balance_after,
         reference_type, reference_id, description, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $8::uuid)
       RETURNING id, tenant_id, entry_type, amount, balance_after,
                 reference_type, reference_id, description, created_by, created_at`,
      [
        input.tenantId,
        input.entryType,
        delta,
        next,
        input.referenceType,
        input.referenceId,
        input.description,
        isUuid(input.createdBy) ? input.createdBy : null,
      ],
    );

    await client.query('COMMIT');
    const row = inserted.rows[0]!;
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      entryType: row.entry_type as KontorLedgerType,
      amount: toNumber(row.amount),
      balanceAfter: toNumber(row.balance_after),
      referenceType: row.reference_type,
      referenceId: row.reference_id ? String(row.reference_id) : null,
      description: row.description,
      createdBy: row.created_by ? String(row.created_by) : null,
      createdAt: new Date(row.created_at).toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function isUuid(value: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function appendStub(input: {
  tenantId: string;
  entryType: KontorLedgerType;
  absoluteAmount: number;
  referenceType: string;
  referenceId: string;
  description: string | null;
  createdBy: string | null;
}): KontorLedgerEntry {
  const row = stubBalances.get(input.tenantId) ?? { balance: 0, reserved: 0 };
  const delta =
    input.entryType === 'debit' ? -input.absoluteAmount : input.absoluteAmount;
  const available = row.balance - row.reserved;
  if (input.entryType === 'debit' && available < input.absoluteAmount) {
    throw new AdminKontorError(
      `Yetersiz kontör (kullanılabilir: ${available})`,
      'insufficient_kontor',
      402,
      { available, required: input.absoluteAmount },
    );
  }
  const next = row.balance + delta;
  if (next < 0) {
    throw new AdminKontorError('Bakiye negatif olamaz', 'insufficient_kontor', 402);
  }
  stubBalances.set(input.tenantId, { balance: next, reserved: row.reserved });
  const entry: KontorLedgerEntry = {
    id: randomUUID(),
    tenantId: input.tenantId,
    entryType: input.entryType,
    amount: delta,
    balanceAfter: next,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    description: input.description,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
  const list = stubLedger.get(input.tenantId) ?? [];
  list.unshift(entry);
  stubLedger.set(input.tenantId, list);
  return entry;
}

/** Superadmin kontör yükleme (credit). */
export async function adminCreditKontor(params: {
  tenantId: string;
  amount: number;
  description?: string;
  createdBy: string;
  referenceId?: string;
}): Promise<KontorLedgerEntry> {
  if (!(params.amount > 0)) {
    throw new AdminKontorError('amount pozitif olmalı', 'validation_error');
  }
  const input = {
    tenantId: params.tenantId,
    entryType: 'credit' as const,
    absoluteAmount: params.amount,
    referenceType: 'admin_grant',
    referenceId: params.referenceId ?? randomUUID(),
    description: params.description ?? 'Superadmin kontör yükleme',
    createdBy: params.createdBy,
  };
  if (!useCentral()) return appendStub(input);
  return appendCentral(getCentralPool(), input);
}

/** Superadmin kontör düşümü (debit). */
export async function adminDebitKontor(params: {
  tenantId: string;
  amount: number;
  description?: string;
  createdBy: string;
  referenceId?: string;
}): Promise<KontorLedgerEntry> {
  if (!(params.amount > 0)) {
    throw new AdminKontorError('amount pozitif olmalı', 'validation_error');
  }
  const input = {
    tenantId: params.tenantId,
    entryType: 'debit' as const,
    absoluteAmount: params.amount,
    referenceType: 'admin_adjust',
    referenceId: params.referenceId ?? randomUUID(),
    description: params.description ?? 'Superadmin kontör düşümü',
    createdBy: params.createdBy,
  };
  if (!useCentral()) return appendStub(input);
  return appendCentral(getCentralPool(), input);
}
