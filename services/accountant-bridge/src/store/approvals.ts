import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { AccountantSession, PeriodApproval } from "../types.js";

interface StoreShape {
  sessions: AccountantSession[];
  approvals: PeriodApproval[];
}

const memory: StoreShape = { sessions: [], approvals: [] };
let loaded = false;

function load(): StoreShape {
  if (loaded) return memory;
  loaded = true;
  try {
    if (existsSync(config.approvalsStorePath)) {
      const raw = readFileSync(config.approvalsStorePath, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      memory.sessions = parsed.sessions ?? [];
      memory.approvals = parsed.approvals ?? [];
    }
  } catch {
    // bozuk dosya → bellekle devam
  }
  return memory;
}

function persist(): void {
  try {
    mkdirSync(dirname(config.approvalsStorePath), { recursive: true });
    writeFileSync(
      config.approvalsStorePath,
      JSON.stringify(memory, null, 2),
      "utf8",
    );
  } catch {
    // disk yazılamazsa bellek yine geçerli
  }
}

/** Testlerde izolasyon için */
export function resetStore(): void {
  memory.sessions = [];
  memory.approvals = [];
  loaded = true;
}

export function saveSession(session: AccountantSession): void {
  load();
  memory.sessions = memory.sessions.filter((s) => s.token !== session.token);
  memory.sessions.push(session);
  persist();
}

export function getSession(token: string): AccountantSession | undefined {
  load();
  const s = memory.sessions.find((x) => x.token === token);
  if (!s) return undefined;
  if (Date.parse(s.expiresAt) < Date.now()) {
    memory.sessions = memory.sessions.filter((x) => x.token !== token);
    persist();
    return undefined;
  }
  return s;
}

export function saveApproval(
  input: Omit<PeriodApproval, "id" | "approvedAt" | "status">,
): PeriodApproval {
  load();
  const approval: PeriodApproval = {
    ...input,
    id: randomUUID(),
    approvedAt: new Date().toISOString(),
    status: "approved",
  };
  memory.approvals = memory.approvals.filter(
    (a) => !(a.tenantId === approval.tenantId && a.period === approval.period),
  );
  memory.approvals.push(approval);
  persist();
  return approval;
}

export function getApproval(
  tenantId: string,
  period: string,
  approvalId?: string,
): PeriodApproval | undefined {
  load();
  if (approvalId) {
    return memory.approvals.find(
      (a) => a.id === approvalId && a.tenantId === tenantId,
    );
  }
  return memory.approvals.find(
    (a) => a.tenantId === tenantId && a.period === period,
  );
}

export function listApprovals(tenantId?: string): PeriodApproval[] {
  load();
  if (!tenantId) return [...memory.approvals];
  return memory.approvals.filter((a) => a.tenantId === tenantId);
}
