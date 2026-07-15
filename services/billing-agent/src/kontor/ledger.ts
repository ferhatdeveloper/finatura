import type { PoolClient } from 'pg';
import { getCentralPool } from '../db/centralPool.js';
import {
  InsufficientKontorError,
  KontorValidationError,
  type KontorBalance,
  type KontorLedgerEntry,
  type KontorLedgerType,
} from '../types.js';

/**
 * Merkezi kontör ledger modeli.
 *
 * Şema (yalnızca referans — migrasyon yok):
 *   tenant_kontor_balances, kontor_ledger, kontor_ledger_type
 *   → database/central/01_schema.sql
 *
 * Kurallar:
 *   - Append-only ledger; bakiye satırı her hareketle güncellenir.
 *   - credit / refund / pozitif adjust → amount > 0
 *   - debit → amount < 0 (maliyet pozitif verilir, işaret burada çevrilir)
 *   - Aynı (tenant_id, reference_type, reference_id) debit tekrarında idempotent dönüş
 */

interface LedgerRow {
  id: string;
  tenant_id: string;
  entry_type: KontorLedgerType;
  amount: string;
  balance_after: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: Date;
}

interface BalanceRow {
  tenant_id: string;
  balance: string;
  reserved: string;
  updated_at: Date | null;
}

function toNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (Number.isNaN(n)) {
    throw new Error(`Geçersiz numeric değer: ${value}`);
  }
  return n;
}

function mapLedger(row: LedgerRow): KontorLedgerEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entryType: row.entry_type,
    amount: toNumber(row.amount),
    balanceAfter: toNumber(row.balance_after),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapBalance(row: BalanceRow): KontorBalance {
  const balance = toNumber(row.balance);
  const reserved = toNumber(row.reserved);
  return {
    tenantId: row.tenant_id,
    balance,
    reserved,
    available: balance - reserved,
    updatedAt: row.updated_at,
  };
}

export interface AppendLedgerInput {
  tenantId: string;
  entryType: KontorLedgerType;
  /** Mutlak tutar (> 0). İşaret entryType'a göre ledger'da belirlenir. */
  absoluteAmount: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdBy?: string | null;
  /**
   * Aynı (reference_type, reference_id, entry_type) tekrarında mevcut kaydı döndür.
   * debit varsayılan true; credit için ödeme webhook'unda açıkça true verilmeli.
   */
  idempotent?: boolean;
}

export interface AppendLedgerResult {
  entry: KontorLedgerEntry;
  idempotentReplay: boolean;
}

function signedAmount(entryType: KontorLedgerType, absoluteAmount: number): number {
  if (!(absoluteAmount > 0)) {
    throw new KontorValidationError('absoluteAmount pozitif olmalı');
  }
  switch (entryType) {
    case 'debit':
      return -absoluteAmount;
    case 'credit':
    case 'refund':
    case 'adjust':
      return absoluteAmount;
    default: {
      const _exhaustive: never = entryType;
      throw new KontorValidationError(`Bilinmeyen entry_type: ${_exhaustive}`);
    }
  }
}

async function ensureBalanceRow(
  client: PoolClient,
  tenantId: string,
): Promise<BalanceRow> {
  // Şema: tenant_kontor_balances (tenant_id, balance, reserved, updated_at)
  await client.query(
    `INSERT INTO public.tenant_kontor_balances (tenant_id, balance, reserved)
     VALUES ($1, 0, 0)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId],
  );

  const locked = await client.query<BalanceRow>(
    `SELECT tenant_id, balance, reserved, updated_at
     FROM public.tenant_kontor_balances
     WHERE tenant_id = $1
     FOR UPDATE`,
    [tenantId],
  );

  if (!locked.rows[0]) {
    throw new Error('tenant_kontor_balances satırı oluşturulamadı');
  }
  return locked.rows[0];
}

async function findExistingByReference(
  client: PoolClient,
  tenantId: string,
  referenceType: string,
  referenceId: string,
  entryType: KontorLedgerType,
): Promise<KontorLedgerEntry | null> {
  // Şema: kontor_ledger (reference_type, reference_id) indeksi
  const result = await client.query<LedgerRow>(
    `SELECT id, tenant_id, entry_type, amount, balance_after,
            reference_type, reference_id, description, created_by, created_at
     FROM public.kontor_ledger
     WHERE tenant_id = $1
       AND reference_type = $2
       AND reference_id = $3
       AND entry_type = $4
     ORDER BY created_at ASC
     LIMIT 1`,
    [tenantId, referenceType, referenceId, entryType],
  );
  return result.rows[0] ? mapLedger(result.rows[0]) : null;
}

export class KontorLedger {
  /** Güncel bakiye özeti */
  async getBalance(tenantId: string): Promise<KontorBalance> {
    const pool = getCentralPool();
    const result = await pool.query<BalanceRow>(
      `SELECT tenant_id, balance, reserved, updated_at
       FROM public.tenant_kontor_balances
       WHERE tenant_id = $1`,
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
    return mapBalance(result.rows[0]);
  }

  /** Son ledger hareketleri (yeniden eskiye) */
  async listLedger(
    tenantId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<KontorLedgerEntry[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const pool = getCentralPool();
    const result = await pool.query<LedgerRow>(
      `SELECT id, tenant_id, entry_type, amount, balance_after,
              reference_type, reference_id, description, created_by, created_at
       FROM public.kontor_ledger
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );
    return result.rows.map(mapLedger);
  }

  /**
   * Ledger'a hareket ekler ve bakiyeyi atomik günceller.
   * Debit'te yetersiz kullanılabilir bakiye → InsufficientKontorError.
   */
  async append(input: AppendLedgerInput): Promise<AppendLedgerResult> {
    const {
      tenantId,
      entryType,
      absoluteAmount,
      referenceType = null,
      referenceId = null,
      description = null,
      createdBy = null,
      idempotent = true,
    } = input;

    if (!tenantId) {
      throw new KontorValidationError('tenantId zorunlu');
    }

    const delta = signedAmount(entryType, absoluteAmount);
    const pool = getCentralPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (idempotent && referenceType && referenceId) {
        const existing = await findExistingByReference(
          client,
          tenantId,
          referenceType,
          referenceId,
          entryType,
        );
        if (existing) {
          await client.query('COMMIT');
          return { entry: existing, idempotentReplay: true };
        }
      }

      const balanceRow = await ensureBalanceRow(client, tenantId);
      const current = mapBalance(balanceRow);
      const nextBalance = current.balance + delta;

      if (entryType === 'debit' && current.available < absoluteAmount) {
        throw new InsufficientKontorError(current.available, absoluteAmount);
      }

      if (nextBalance < 0) {
        throw new InsufficientKontorError(current.available, absoluteAmount);
      }

      // reserved, debit sonrası da balance'ı aşmamalı (CHECK reserved <= balance)
      if (current.reserved > nextBalance) {
        throw new KontorValidationError(
          'Rezerve kontör güncel bakiyeyi aşıyor; düşüm yapılamaz',
        );
      }

      await client.query(
        `UPDATE public.tenant_kontor_balances
         SET balance = $2, updated_at = now()
         WHERE tenant_id = $1`,
        [tenantId, nextBalance],
      );

      const inserted = await client.query<LedgerRow>(
        `INSERT INTO public.kontor_ledger (
           tenant_id, entry_type, amount, balance_after,
           reference_type, reference_id, description, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, tenant_id, entry_type, amount, balance_after,
                   reference_type, reference_id, description, created_by, created_at`,
        [
          tenantId,
          entryType,
          delta,
          nextBalance,
          referenceType,
          referenceId,
          description,
          createdBy,
        ],
      );

      await client.query('COMMIT');
      return {
        entry: mapLedger(inserted.rows[0]!),
        idempotentReplay: false,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Kullanım düşümü (debit) */
  async debit(params: {
    tenantId: string;
    amount: number;
    referenceType: string;
    referenceId: string;
    description?: string;
    createdBy?: string | null;
  }): Promise<AppendLedgerResult> {
    return this.append({
      tenantId: params.tenantId,
      entryType: 'debit',
      absoluteAmount: params.amount,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      description: params.description ?? null,
      createdBy: params.createdBy ?? null,
      idempotent: true,
    });
  }

  /** Yükleme / hediye (credit) — Aşama 6.2 ödeme köprüsü burayı kullanır */
  async credit(params: {
    tenantId: string;
    amount: number;
    referenceType?: string;
    referenceId?: string | null;
    description?: string;
    createdBy?: string | null;
    /** Ödeme webhook'unda conversationId ile true verin */
    idempotent?: boolean;
  }): Promise<AppendLedgerResult> {
    return this.append({
      tenantId: params.tenantId,
      entryType: 'credit',
      absoluteAmount: params.amount,
      referenceType: params.referenceType ?? 'topup',
      referenceId: params.referenceId ?? null,
      description: params.description ?? null,
      createdBy: params.createdBy ?? null,
      idempotent: params.idempotent ?? Boolean(params.referenceId),
    });
  }
}

export const kontorLedger = new KontorLedger();
