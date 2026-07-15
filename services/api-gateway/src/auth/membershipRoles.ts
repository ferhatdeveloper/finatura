/**
 * tenant_memberships.role — SQL ile aynı tek kaynak:
 * public.membership_role (database/central/05b_membership_accountant.sql)
 */
export const MEMBERSHIP_ROLES = [
  'owner',
  'admin',
  'member',
  'viewer',
  'accountant',
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const ACCOUNTANT_LINK_STATUSES = [
  'pending',
  'approved',
  'revoked',
] as const;

export type AccountantLinkStatus = (typeof ACCOUNTANT_LINK_STATUSES)[number];

/** Davet / yönetim için yetkili roller */
export const ACCOUNTANT_INVITE_ROLES: readonly MembershipRole[] = [
  'owner',
  'admin',
];

export function isMembershipRole(value: string): value is MembershipRole {
  return (MEMBERSHIP_ROLES as readonly string[]).includes(value);
}

export function canInviteAccountant(role: string | undefined): boolean {
  return (
    role !== undefined &&
    (ACCOUNTANT_INVITE_ROLES as readonly string[]).includes(role)
  );
}
