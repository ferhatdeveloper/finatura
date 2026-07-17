/** Accountant Bridge istemcisi — mock fallback yok. */

const API_BASE =
  import.meta.env.VITE_ACCOUNTANT_API_URL?.replace(/\/$/, "") ||
  "/api/accountant";

export interface VerifyCodeResult {
  ok: true;
  token: string;
  tenantId: string;
  tenantName: string;
  accountantName: string;
  expiresAt: string;
}

export interface PeriodApproval {
  id: string;
  tenantId: string;
  period: string;
  includeInvoices: boolean;
  includeBank: boolean;
  invoiceIds: string[];
  bankIds: string[];
  approvedAt: string;
  status: "approved";
}

export interface ApprovePeriodResult {
  ok: true;
  approval: PeriodApproval;
}

export interface ExportLucaJson {
  ok: true;
  filename: string;
  fisAdedi: number;
  toplamBorc: number;
  toplamAlacak: number;
  dengeli: boolean;
  uyarilar: string[];
  approvalId?: string;
  xml: string;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return body.message || body.error || res.statusText;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function verifyCode(
  tenantId: string,
  code: string,
): Promise<VerifyCodeResult> {
  const res = await fetch(`${API_BASE}/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, code }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as VerifyCodeResult;
}

export async function approvePeriod(input: {
  token: string;
  tenantId: string;
  period: string;
  includeInvoices?: boolean;
  includeBank?: boolean;
  invoiceIds?: string[];
  bankIds?: string[];
}): Promise<ApprovePeriodResult> {
  const res = await fetch(`${API_BASE}/approve-period`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ApprovePeriodResult;
}

/** JSON formatında XML + meta (indirme için). */
export async function exportLucaJson(input: {
  token: string;
  tenantId: string;
  period: string;
  approvalId?: string;
}): Promise<ExportLucaJson> {
  const res = await fetch(`${API_BASE}/export-luca?format=json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Accountant-Token": input.token,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ExportLucaJson;
}

export function downloadXml(filename: string, xml: string): void {
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

