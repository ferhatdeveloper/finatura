import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv();

export const config = {
  port: Number(process.env.PORT ?? 4055),
  nodeEnv: process.env.NODE_ENV ?? "development",
  approvalsStorePath: resolve(
    process.cwd(),
    process.env.APPROVALS_STORE_PATH ?? "./data/approvals.json",
  ),
  /** Stub oturum süresi (ms) */
  sessionTtlMs: 4 * 60 * 60 * 1000,
};
