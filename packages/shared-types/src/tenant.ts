import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateTimeSchema,
  jsonObjectSchema,
  uuidSchema,
} from './common.js';
import {
  membershipRoleSchema,
  sectorCodeSchema,
  subscriptionStatusSchema,
  tenantStatusSchema,
} from './enums.js';

/**
 * Merkez `tenants` satırı.
 * Kaynak: database/central/01_schema.sql
 */
export const tenantSchema = z.object({
  id: uuidSchema,
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  display_name: z.string().min(1),
  legal_name: z.string().nullable(),
  tax_office: z.string().nullable(),
  tax_number: z.string().nullable(),
  sector_id: uuidSchema,
  status: tenantStatusSchema,
  primary_email: z.string().email().nullable(),
  primary_phone: z.string().nullable(),
  timezone: z.string().default('Europe/Istanbul'),
  locale: z.string().default('tr-TR'),
  metadata: jsonObjectSchema.default({}),
  provisioned_at: isoDateTimeSchema.nullable(),
  suspended_at: isoDateTimeSchema.nullable(),
  cancelled_at: isoDateTimeSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type Tenant = z.infer<typeof tenantSchema>;

/** Tenant oluşturma / kayıt girişi (id ve audit alanları yok). */
export const tenantCreateSchema = tenantSchema
  .omit({
    id: true,
    provisioned_at: true,
    suspended_at: true,
    cancelled_at: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .partial({
    legal_name: true,
    tax_office: true,
    tax_number: true,
    status: true,
    primary_email: true,
    primary_phone: true,
    timezone: true,
    locale: true,
    metadata: true,
  });

export type TenantCreate = z.infer<typeof tenantCreateSchema>;

/** Router / dashboard için secret içermeyen özet. */
export const tenantSummarySchema = z.object({
  tenant_id: uuidSchema,
  slug: z.string(),
  display_name: z.string(),
  tenant_status: tenantStatusSchema,
  sector_code: sectorCodeSchema,
  schema_version: z.string().nullable().optional(),
  kontor_balance: z.number().nonnegative().optional(),
});

export type TenantSummary = z.infer<typeof tenantSummarySchema>;

export const tenantMembershipSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  user_id: uuidSchema,
  role: membershipRoleSchema,
  is_active: z.boolean(),
  invited_at: isoDateTimeSchema.nullable(),
  joined_at: isoDateTimeSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  deleted_at: isoDateTimeSchema.nullable(),
});

export type TenantMembership = z.infer<typeof tenantMembershipSchema>;

export const tenantSubscriptionSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  plan_id: uuidSchema,
  status: subscriptionStatusSchema,
  starts_at: isoDateTimeSchema,
  ends_at: isoDateTimeSchema.nullable(),
  trial_ends_at: isoDateTimeSchema.nullable(),
  cancelled_at: isoDateTimeSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export type TenantSubscription = z.infer<typeof tenantSubscriptionSchema>;

export const subscriptionPlanSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1),
  name_tr: z.string().min(1),
  description: z.string().nullable(),
  included_kontor: z.number().int().nonnegative(),
  price_amount: z.number().nullable(),
  currency_code: currencyCodeSchema,
  billing_period: z.enum(['monthly', 'yearly', 'one_time']),
  is_active: z.boolean(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
