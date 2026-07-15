import { afterEach, describe, expect, it } from "vitest";
import { approvePeriod } from "../src/services/approve-period.js";
import { exportLucaForPeriod } from "../src/services/export-luca.js";
import { verifyAccountantCode } from "../src/services/verify-code.js";
import { resetStore } from "../src/store/approvals.js";

afterEach(() => {
  resetStore();
});

describe("kod doğrula → dönem onayla → Luca XML", () => {
  it("geçerli kod ile oturum açar", () => {
    const res = verifyAccountantCode({
      tenantId: "anadolu-oto",
      code: "MM-2026-DEMO",
    });
    expect(res.ok).toBe(true);
    expect(res.token).toMatch(/^acc_/);
    expect(res.tenantId).toBe("anadolu-oto");
  });

  it("onay sonrası XML üretir ve dengeli özet döner", () => {
    const auth = verifyAccountantCode({
      tenantId: "anadolu-oto",
      code: "mm-2026-demo",
    });

    const approved = approvePeriod({
      token: auth.token,
      tenantId: "anadolu-oto",
      period: "2026-07",
      includeInvoices: true,
      includeBank: true,
      invoiceIds: ["o1", "o2"],
      bankIds: ["o4"],
    });

    expect(approved.approval.status).toBe("approved");
    expect(approved.approval.invoiceIds).toEqual(["o1", "o2"]);

    const exported = exportLucaForPeriod({
      token: auth.token,
      tenantId: "anadolu-oto",
      period: "2026-07",
      approvalId: approved.approval.id,
    });

    expect(exported.filename).toBe("luca-anadolu-oto-2026-07.xml");
    expect(exported.xml).toContain("<?xml");
    expect(exported.meta.fisAdedi).toBeGreaterThan(0);
    expect(exported.meta.ok).toBe(true);
  });
});
