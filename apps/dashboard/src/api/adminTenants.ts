import { endpoints } from "./config";
import { gatewayFetch } from "./client";

export interface KontorBalance {
  tenantId: string;
  balance: number;
  reserved: number;
  available: number;
  updatedAt: string | null;
}

export interface AdminTenantListItem {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  primaryEmail?: string | null;
  maliMusavirKodu?: string | null;
  createdAt?: string;
  suspendedAt?: string | null;
  kontor: KontorBalance;
}

export interface AdminTenantUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  isPlatformAdmin?: boolean;
  membershipAt?: string;
}

export interface KontorLedgerEntry {
  id: string;
  tenantId: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

export async function fetchAdminTenants(params?: {
  q?: string;
  status?: string;
}): Promise<{ items: AdminTenantListItem[]; warning?: string }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return gatewayFetch(`${endpoints.adminTenants}${suffix}`, { method: "GET" });
}

export async function fetchAdminTenantDetail(id: string): Promise<{
  tenant: AdminTenantListItem & { cancelledAt?: string | null };
  kontor: KontorBalance;
  users: AdminTenantUser[];
  warning?: string;
}> {
  return gatewayFetch(`${endpoints.adminTenants}/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

export async function fetchAdminKontorLedger(
  id: string,
  limit = 50,
): Promise<{
  tenantId: string;
  balance: KontorBalance;
  items: KontorLedgerEntry[];
}> {
  const qs = new URLSearchParams({ limit: String(limit) });
  return gatewayFetch(
    `${endpoints.adminTenants}/${encodeURIComponent(id)}/kontor/ledger?${qs}`,
    { method: "GET" },
  );
}

export async function creditTenantKontor(
  id: string,
  amount: number,
  description?: string,
): Promise<{ ok: boolean; entry: KontorLedgerEntry; balance: KontorBalance }> {
  return gatewayFetch(
    `${endpoints.adminTenants}/${encodeURIComponent(id)}/kontor/credit`,
    {
      method: "POST",
      body: JSON.stringify({ amount, description }),
    },
  );
}

export async function debitTenantKontor(
  id: string,
  amount: number,
  description?: string,
): Promise<{ ok: boolean; entry: KontorLedgerEntry; balance: KontorBalance }> {
  return gatewayFetch(
    `${endpoints.adminTenants}/${encodeURIComponent(id)}/kontor/debit`,
    {
      method: "POST",
      body: JSON.stringify({ amount, description }),
    },
  );
}

export async function patchTenantStatus(
  id: string,
  status: "active" | "suspended",
): Promise<{ ok: boolean; status: string; warning?: string }> {
  return gatewayFetch(
    `${endpoints.adminTenants}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
