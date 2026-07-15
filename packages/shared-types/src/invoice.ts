import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  jsonObjectSchema,
  uuidSchema,
} from './common.js';
import {
  invoiceDirectionSchema,
  invoiceKindSchema,
  invoiceStatusSchema,
} from './enums.js';

/**
 * Tenant `invoices` satırı (e-Fatura / e-Arşiv / Gider Pusulası).
 * Kaynak: database/tenant_template/01_schema.sql
 */
export const invoiceSchema = z.object({
  id: uuidSchema,
  kind: invoiceKindSchema,
  direction: invoiceDirectionSchema,
  status: invoiceStatusSchema,
  document_number: z.string().nullable(),
  uuid_ettn: uuidSchema.nullable(),
  issue_date: isoDateSchema,
  cari_id: uuidSchema.nullable(),
  counterparty_title: z.string().nullable(),
  counterparty_vkn: z.string().nullable(),
  currency_code: currencyCodeSchema,
  exchange_rate: z.number().positive().nullable(),
  net_total: z.number().nonnegative(),
  vat_total: z.number().nonnegative(),
  grand_total: z.number().nonnegative(),
  vat_rate: z.number().min(0).max(100).nullable(),
  related_vehicle_id: uuidSchema.nullable(),
  related_real_estate_id: uuidSchema.nullable(),
  provider_payload: jsonObjectSchema.default({}),
  error_message: z.string().nullable(),
  sent_at: isoDateTimeSchema.nullable(),
  notes: z.string().nullable(),
  metadata: jsonObjectSchema.default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceCreateSchema = invoiceSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .partial({
    direction: true,
    status: true,
    document_number: true,
    uuid_ettn: true,
    issue_date: true,
    cari_id: true,
    counterparty_title: true,
    counterparty_vkn: true,
    currency_code: true,
    exchange_rate: true,
    net_total: true,
    vat_total: true,
    grand_total: true,
    vat_rate: true,
    related_vehicle_id: true,
    related_real_estate_id: true,
    provider_payload: true,
    error_message: true,
    sent_at: true,
    notes: true,
    metadata: true,
  });

export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>;

export const invoiceUpdateSchema = invoiceCreateSchema.partial();
export type InvoiceUpdate = z.infer<typeof invoiceUpdateSchema>;
