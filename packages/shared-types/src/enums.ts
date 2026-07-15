import { z } from 'zod';

// —— Central (finatura_central) ——

export const sectorCodeSchema = z.enum(['oto_galeri', 'kuyumculuk', 'emlak']);
export type SectorCode = z.infer<typeof sectorCodeSchema>;

export const tenantStatusSchema = z.enum([
  'pending',
  'provisioning',
  'active',
  'suspended',
  'cancelled',
]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const subscriptionStatusSchema = z.enum([
  'trial',
  'active',
  'past_due',
  'cancelled',
  'expired',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const kontorLedgerTypeSchema = z.enum([
  'credit',
  'debit',
  'adjust',
  'refund',
]);
export type KontorLedgerType = z.infer<typeof kontorLedgerTypeSchema>;

export const membershipRoleSchema = z.enum([
  'owner',
  'admin',
  'member',
  'viewer',
]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

// —— Tenant template ——

export const cariPartyTypeSchema = z.enum([
  'customer',
  'supplier',
  'realtor',
  'both',
]);
export type CariPartyType = z.infer<typeof cariPartyTypeSchema>;

export const identityTypeSchema = z.enum([
  'tckn',
  'vkn',
  'passport',
  'other',
]);
export type IdentityType = z.infer<typeof identityTypeSchema>;

export const vehicleStatusSchema = z.enum([
  'in_stock',
  'reserved',
  'sold',
  'consignment',
  'returned',
  'archived',
]);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

export const realEstateTypeSchema = z.enum([
  'land',
  'residential',
  'commercial',
  'other',
]);
export type RealEstateType = z.infer<typeof realEstateTypeSchema>;

export const realEstateStatusSchema = z.enum([
  'available',
  'reserved',
  'sold',
  'rented',
  'withdrawn',
  'archived',
]);
export type RealEstateStatus = z.infer<typeof realEstateStatusSchema>;

export const invoiceKindSchema = z.enum([
  'efatura',
  'earsiv',
  'gider_pusulasi',
]);
export type InvoiceKind = z.infer<typeof invoiceKindSchema>;

export const invoiceDirectionSchema = z.enum(['sales', 'purchase']);
export type InvoiceDirection = z.infer<typeof invoiceDirectionSchema>;

export const invoiceStatusSchema = z.enum([
  'draft',
  'queued',
  'sent',
  'accepted',
  'rejected',
  'cancelled',
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const bankTxDirectionSchema = z.enum(['inbound', 'outbound']);
export type BankTxDirection = z.infer<typeof bankTxDirectionSchema>;

export const bankTxMatchStatusSchema = z.enum([
  'unmatched',
  'matched',
  'ignored',
]);
export type BankTxMatchStatus = z.infer<typeof bankTxMatchStatusSchema>;

export const veresiyeAssetKindSchema = z.enum(['tl', 'gold', 'fx']);
export type VeresiyeAssetKind = z.infer<typeof veresiyeAssetKindSchema>;

export const veresiyeDirectionSchema = z.enum(['debit', 'credit']);
export type VeresiyeDirection = z.infer<typeof veresiyeDirectionSchema>;
