import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  jsonObjectSchema,
  uuidSchema,
} from './common.js';
import { bankTxDirectionSchema, bankTxMatchStatusSchema } from './enums.js';

/**
 * Tenant `bank_accounts` satırı.
 * Kaynak: database/tenant_template/01_schema.sql
 */
export const bankAccountSchema = z.object({
  id: uuidSchema,
  bank_name: z.string().min(1),
  iban: z.string().nullable(),
  account_alias: z.string().nullable(),
  currency_code: currencyCodeSchema,
  is_active: z.boolean(),
  provider_ref: z.string().nullable(),
  metadata: jsonObjectSchema.default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;

/**
 * Tenant `bank_transactions` satırı (Finteo vb.).
 */
export const bankTransactionSchema = z.object({
  id: uuidSchema,
  bank_account_id: uuidSchema,
  provider: z.string().min(1),
  provider_tx_id: z.string().nullable(),
  direction: bankTxDirectionSchema,
  amount: z.number().positive(),
  currency_code: currencyCodeSchema,
  transaction_at: isoDateTimeSchema,
  value_date: isoDateSchema.nullable(),
  counterparty_name: z.string().nullable(),
  counterparty_iban: z.string().nullable(),
  description: z.string().nullable(),
  raw_payload: jsonObjectSchema.default({}),
  match_status: bankTxMatchStatusSchema,
  matched_cari_id: uuidSchema.nullable(),
  matched_invoice_id: uuidSchema.nullable(),
  matched_veresiye_id: uuidSchema.nullable(),
  imported_at: isoDateTimeSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type BankTransaction = z.infer<typeof bankTransactionSchema>;

export const bankTransactionCreateSchema = bankTransactionSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .partial({
    provider: true,
    provider_tx_id: true,
    currency_code: true,
    value_date: true,
    counterparty_name: true,
    counterparty_iban: true,
    description: true,
    raw_payload: true,
    match_status: true,
    matched_cari_id: true,
    matched_invoice_id: true,
    matched_veresiye_id: true,
    imported_at: true,
  });

export type BankTransactionCreate = z.infer<typeof bankTransactionCreateSchema>;

export const bankTransactionUpdateSchema = bankTransactionCreateSchema.partial();
export type BankTransactionUpdate = z.infer<typeof bankTransactionUpdateSchema>;
