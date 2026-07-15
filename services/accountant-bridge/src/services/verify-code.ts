import { randomBytes } from "node:crypto";
import { config } from "../config.js";
import { findStubCode } from "../stub-codes.js";
import { saveSession } from "../store/approvals.js";
import type { VerifyCodeRequest, VerifyCodeResponse } from "../types.js";

export class VerifyCodeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "VerifyCodeError";
  }
}

export function verifyAccountantCode(
  body: VerifyCodeRequest,
): VerifyCodeResponse {
  const tenantId = body.tenantId?.trim();
  const code = body.code?.trim();
  if (!tenantId || !code) {
    throw new VerifyCodeError(
      "tenantId ve code zorunlu",
      400,
      "missing_fields",
    );
  }

  const match = findStubCode(tenantId, code);
  if (!match) {
    throw new VerifyCodeError(
      "Geçersiz müşavir kodu veya tenant",
      401,
      "invalid_code",
    );
  }

  const token = `acc_${randomBytes(24).toString("hex")}`;
  const expiresAt = new Date(Date.now() + config.sessionTtlMs).toISOString();

  saveSession({
    token,
    tenantId: match.tenantId,
    tenantName: match.tenantName,
    accountantName: match.accountantName,
    expiresAt,
  });

  return {
    ok: true,
    token,
    tenantId: match.tenantId,
    tenantName: match.tenantName,
    accountantName: match.accountantName,
    expiresAt,
  };
}
