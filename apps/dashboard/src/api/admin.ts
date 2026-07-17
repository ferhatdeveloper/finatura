import { endpoints } from "./config";
import { gatewayFetch } from "./client";

export type SystemSettings = Record<string, unknown>;

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const data = await gatewayFetch<{ settings: SystemSettings }>(
    endpoints.adminSettings,
    { method: "GET" },
  );
  return data.settings ?? {};
}

export async function saveSystemSettings(
  settings: Record<string, string | boolean>,
): Promise<{ ok: boolean; warning?: string }> {
  return gatewayFetch(endpoints.adminSettings, {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
}
