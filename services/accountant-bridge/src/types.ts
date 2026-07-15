export interface VerifyCodeRequest {
  tenantId: string;
  code: string;
}

export interface VerifyCodeResponse {
  ok: true;
  token: string;
  tenantId: string;
  tenantName: string;
  accountantName: string;
  expiresAt: string;
}

export interface ApprovePeriodRequest {
  token: string;
  tenantId: string;
  period: string; // YYYY-MM
  includeInvoices?: boolean;
  includeBank?: boolean;
  invoiceIds?: string[];
  bankIds?: string[];
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

export interface ApprovePeriodResponse {
  ok: true;
  approval: PeriodApproval;
}

export interface ExportLucaRequest {
  token: string;
  tenantId: string;
  period: string; // YYYY-MM
  approvalId?: string;
  /** Yoksa onay kaydındaki seçim kullanılır */
  includeInvoices?: boolean;
  includeBank?: boolean;
}

export interface ExportLucaMeta {
  ok: true;
  filename: string;
  fisAdedi: number;
  toplamBorc: number;
  toplamAlacak: number;
  dengeli: boolean;
  uyarilar: string[];
  approvalId?: string;
}

export interface AccountantSession {
  token: string;
  tenantId: string;
  tenantName: string;
  accountantName: string;
  expiresAt: string;
}

export interface StubAccountantCode {
  tenantId: string;
  tenantName: string;
  code: string;
  accountantName: string;
  firmaUnvan: string;
  firmaVkn: string;
}
