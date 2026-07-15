import { z } from 'zod';

import {
  isoDateTimeSchema,
  jsonObjectSchema,
  uuidSchema,
} from './common.js';
import { cariPartyTypeSchema, identityTypeSchema } from './enums.js';

/**
 * Tenant `customer_caris` satırı (Cari kartı).
 * Kaynak: database/tenant_template/01_schema.sql
 */
export const cariSchema = z.object({
  id: uuidSchema,
  code: z.string().nullable(),
  party_type: cariPartyTypeSchema,
  title: z.string().min(1),
  identity_type: identityTypeSchema.nullable(),
  identity_number: z.string().nullable(),
  tax_office: z.string().nullable(),
  contact_name: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  mobile_phone: z.string().nullable(),
  address_line: z.string().nullable(),
  city: z.string().nullable(),
  district: z.string().nullable(),
  neighborhood: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: z.string().length(2).default('TR'),
  notes: z.string().nullable(),
  is_active: z.boolean(),
  metadata: jsonObjectSchema.default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type Cari = z.infer<typeof cariSchema>;

/** Geriye dönük alias — SQL tablo adı. */
export type CustomerCari = Cari;

export const cariCreateSchema = cariSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .partial({
    code: true,
    party_type: true,
    identity_type: true,
    identity_number: true,
    tax_office: true,
    contact_name: true,
    email: true,
    phone: true,
    mobile_phone: true,
    address_line: true,
    city: true,
    district: true,
    neighborhood: true,
    postal_code: true,
    country_code: true,
    notes: true,
    is_active: true,
    metadata: true,
  });

export type CariCreate = z.infer<typeof cariCreateSchema>;

export const cariUpdateSchema = cariCreateSchema.partial();
export type CariUpdate = z.infer<typeof cariUpdateSchema>;
