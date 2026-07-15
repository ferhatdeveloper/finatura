import { Router } from "express";
import {
  approvePeriod,
  ApprovePeriodError,
} from "../services/approve-period.js";
import {
  exportLucaForPeriod,
  ExportLucaError,
} from "../services/export-luca.js";
import {
  verifyAccountantCode,
  VerifyCodeError,
} from "../services/verify-code.js";
import { listApprovals } from "../store/approvals.js";
import type { ExportLucaRequest } from "../types.js";

export const accountantRouter = Router();

accountantRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "accountant-bridge" });
});

/**
 * POST /api/accountant/verify-code
 * Body: { tenantId, code }
 */
accountantRouter.post("/verify-code", (req, res) => {
  try {
    const result = verifyAccountantCode(req.body ?? {});
    res.json(result);
  } catch (err) {
    if (err instanceof VerifyCodeError) {
      res.status(err.status).json({ ok: false, error: err.code, message: err.message });
      return;
    }
    throw err;
  }
});

/**
 * POST /api/accountant/approve-period
 * Body: { token, tenantId, period, includeInvoices?, includeBank?, invoiceIds?, bankIds? }
 */
accountantRouter.post("/approve-period", (req, res) => {
  try {
    const result = approvePeriod(req.body ?? {});
    res.json(result);
  } catch (err) {
    if (err instanceof ApprovePeriodError) {
      res.status(err.status).json({ ok: false, error: err.code, message: err.message });
      return;
    }
    throw err;
  }
});

function parseExportBody(req: {
  method?: string;
  body?: Partial<ExportLucaRequest>;
  query: Record<string, unknown>;
  headers: Record<string, unknown>;
}): ExportLucaRequest {
  const q = req.query;
  const b = req.body ?? {};
  const headerToken =
    typeof req.headers["x-accountant-token"] === "string"
      ? req.headers["x-accountant-token"]
      : undefined;

  return {
    token: String(b.token ?? q.token ?? headerToken ?? ""),
    tenantId: String(b.tenantId ?? q.tenantId ?? ""),
    period: String(b.period ?? q.period ?? ""),
    approvalId:
      b.approvalId != null || q.approvalId != null
        ? String(b.approvalId ?? q.approvalId)
        : undefined,
    includeInvoices:
      b.includeInvoices != null
        ? Boolean(b.includeInvoices)
        : q.includeInvoices != null
          ? String(q.includeInvoices) !== "false"
          : undefined,
    includeBank:
      b.includeBank != null
        ? Boolean(b.includeBank)
        : q.includeBank != null
          ? String(q.includeBank) !== "false"
          : undefined,
  };
}

function handleExport(
  req: Parameters<typeof parseExportBody>[0],
  res: import("express").Response,
  asJson: boolean,
): void {
  try {
    const { xml, filename, meta } = exportLucaForPeriod(parseExportBody(req));
    if (asJson) {
      res.json({ ...meta, xml });
      return;
    }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.setHeader("X-Luca-Fis-Adedi", String(meta.fisAdedi));
    res.setHeader("X-Luca-Dengeli", String(meta.dengeli));
    res.send(xml);
  } catch (err) {
    if (err instanceof ExportLucaError) {
      res.status(err.status).json({ ok: false, error: err.code, message: err.message });
      return;
    }
    throw err;
  }
}

/**
 * POST /api/accountant/export-luca
 * XML indirme (varsayılan) veya ?format=json
 */
accountantRouter.post("/export-luca", (req, res) => {
  const asJson = String(req.query.format ?? "") === "json";
  handleExport(req, res, asJson);
});

/**
 * GET /api/accountant/export-luca?token&tenantId&period
 */
accountantRouter.get("/export-luca", (req, res) => {
  const asJson = String(req.query.format ?? "") === "json";
  handleExport(req, res, asJson);
});

accountantRouter.get("/approvals", (req, res) => {
  const tenantId =
    typeof req.query.tenantId === "string" ? req.query.tenantId : undefined;
  res.json({ ok: true, approvals: listApprovals(tenantId) });
});
