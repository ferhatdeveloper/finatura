import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  jsonObjectSchema,
  uuidSchema,
} from './common.js';
import { vehicleStatusSchema } from './enums.js';

/**
 * Tenant `vehicles` satırı.
 * Kaynak: database/tenant_template/01_schema.sql
 */
export const vehicleSchema = z.object({
  id: uuidSchema,
  plate: z.string().nullable(),
  chassis_number: z.string().nullable(),
  engine_number: z.string().nullable(),
  brand: z.string().min(1),
  model: z.string().min(1),
  model_year: z.number().int().min(1900).max(2100).nullable(),
  color: z.string().nullable(),
  fuel_type: z.string().nullable(),
  transmission: z.string().nullable(),
  kilometer: z.number().int().nonnegative().nullable(),
  buy_price: z.number().nonnegative().nullable(),
  sell_price: z.number().nonnegative().nullable(),
  vat_rate: z.number().min(0).max(100),
  currency_code: currencyCodeSchema,
  status: vehicleStatusSchema,
  supplier_cari_id: uuidSchema.nullable(),
  buyer_cari_id: uuidSchema.nullable(),
  purchased_at: isoDateSchema.nullable(),
  sold_at: isoDateSchema.nullable(),
  notes: z.string().nullable(),
  metadata: jsonObjectSchema.default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const vehicleCreateSchema = vehicleSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .partial({
    plate: true,
    chassis_number: true,
    engine_number: true,
    model_year: true,
    color: true,
    fuel_type: true,
    transmission: true,
    kilometer: true,
    buy_price: true,
    sell_price: true,
    vat_rate: true,
    currency_code: true,
    status: true,
    supplier_cari_id: true,
    buyer_cari_id: true,
    purchased_at: true,
    sold_at: true,
    notes: true,
    metadata: true,
  });

export type VehicleCreate = z.infer<typeof vehicleCreateSchema>;

export const vehicleUpdateSchema = vehicleCreateSchema.partial();
export type VehicleUpdate = z.infer<typeof vehicleUpdateSchema>;
