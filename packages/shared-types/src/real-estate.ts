import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  jsonObjectSchema,
  uuidSchema,
} from './common.js';
import { realEstateStatusSchema, realEstateTypeSchema } from './enums.js';

/**
 * Tenant `real_estates` satırı.
 * Kaynak: database/tenant_template/01_schema.sql
 */
export const realEstateSchema = z.object({
  id: uuidSchema,
  property_type: realEstateTypeSchema,
  status: realEstateStatusSchema,
  title: z.string().nullable(),
  ada: z.string().nullable(),
  parsel: z.string().nullable(),
  city: z.string().min(1),
  district: z.string().nullable(),
  neighborhood: z.string().nullable(),
  address_line: z.string().nullable(),
  block_number: z.string().nullable(),
  door_number: z.string().nullable(),
  gross_sqm: z.number().nonnegative().nullable(),
  net_sqm: z.number().nonnegative().nullable(),
  list_price: z.number().nonnegative().nullable(),
  sale_price: z.number().nonnegative().nullable(),
  currency_code: currencyCodeSchema,
  vat_rate: z.number().min(0).max(100).nullable(),
  owner_name: z.string().nullable(),
  owner_identity: z.string().nullable(),
  owner_phone: z.string().nullable(),
  owner_cari_id: uuidSchema.nullable(),
  realtor_cari_id: uuidSchema.nullable(),
  buyer_cari_id: uuidSchema.nullable(),
  listed_at: isoDateSchema.nullable(),
  sold_at: isoDateSchema.nullable(),
  notes: z.string().nullable(),
  metadata: jsonObjectSchema.default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type RealEstate = z.infer<typeof realEstateSchema>;

export const realEstateCreateSchema = realEstateSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .partial({
    property_type: true,
    status: true,
    title: true,
    ada: true,
    parsel: true,
    district: true,
    neighborhood: true,
    address_line: true,
    block_number: true,
    door_number: true,
    gross_sqm: true,
    net_sqm: true,
    list_price: true,
    sale_price: true,
    currency_code: true,
    vat_rate: true,
    owner_name: true,
    owner_identity: true,
    owner_phone: true,
    owner_cari_id: true,
    realtor_cari_id: true,
    buyer_cari_id: true,
    listed_at: true,
    sold_at: true,
    notes: true,
    metadata: true,
  });

export type RealEstateCreate = z.infer<typeof realEstateCreateSchema>;

export const realEstateUpdateSchema = realEstateCreateSchema.partial();
export type RealEstateUpdate = z.infer<typeof realEstateUpdateSchema>;
