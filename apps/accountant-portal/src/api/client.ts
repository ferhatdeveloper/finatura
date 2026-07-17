import { apiConfig, endpoints } from "./config";
import { clearSession, loadSession, saveSession } from "../auth/storage";
import type { AuthSession } from "../auth/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOpts = RequestInit & {
  token?: string | null;
  tenantId?: string | null;
  _retried?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

function looksJwt(token: string): boolean {
  return token.split(".").length === 3 && !token.endsWith(".stub");
}

/** Eski mock / imzasız JWT oturumlarını temizle. */
export function purgeInvalidAccountantSession(): void {
  const s = loadSession();
  if (!s) return;
  if (!looksJwt(s.tokens.accessToken)) {
    clearSession();
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = loadSession();
    if (!session?.tokens.refreshToken || !looksJwt(session.tokens.refreshToken)) {
      return false;
    }

    try {
      const res = await fetch(`${apiConfig.gatewayUrl}${endpoints.refresh}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: session.tokens.refreshToken,
          tenantId: session.user.tenantId,
          tenantSlug: session.user.tenantSlug,
          firmaKodu: session.user.firmaKodu ?? session.user.maliMusavirKodu,
        }),
      });

      if (!res.ok) {
        clearSession();
        return false;
      }

      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
      };

      if (!data.accessToken) {
        clearSession();
        return false;
      }

      const next: AuthSession = {
        ...session,
        tokens: {
          ...session.tokens,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? session.tokens.refreshToken,
          expiresIn: Number(data.expiresIn ?? session.tokens.expiresIn),
        },
        source: "gateway",
      };
      saveSession(next);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Gateway isteği — 401'de bir kez refresh. */
export async function gatewayFetch<T>(
  path: string,
  opts: FetchOpts = {},
): Promise<T> {
  const { token, tenantId, headers, _retried, ...rest } = opts;
  const session = loadSession();
  const bearer = token ?? session?.tokens.accessToken ?? null;
  const tenant = tenantId ?? session?.user.tenantId ?? null;

  const res = await fetch(`${apiConfig.gatewayUrl}${path}`, {
    ...rest,
    headers: {
      ...(rest.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(tenant ? { "X-Tenant-ID": tenant } : {}),
      ...headers,
    },
  });

  const text = await res.text();
  const data = parseBody(text);

  if (
    res.status === 401 &&
    !_retried &&
    path !== endpoints.login &&
    path !== endpoints.refresh
  ) {
    const ok = await refreshAccessToken();
    if (ok) {
      return gatewayFetch<T>(path, { ...opts, token: undefined, _retried: true });
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `İstek başarısız (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}
