import { apiConfig, endpoints } from "./config";

const SESSION_KEY = "finatura.dashboard.session";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
  isPlatformAdmin?: boolean;
}

export interface Session {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  firmaKodu: string;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** Üç parçalı JWT değilse (eski mock token) oturumu temizle. */
export function purgeInvalidSession(): void {
  const s = loadSession();
  if (!s) return;
  const looksJwt = (t: string) => t.split(".").length === 3 && !t.startsWith("mock-");
  if (!looksJwt(s.accessToken)) {
    clearSession();
  }
}

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
  /** İç kullanım — 401 sonrası yenileme döngüsünü kes */
  _retried?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = loadSession();
    if (!session?.refreshToken || session.refreshToken.startsWith("mock-")) {
      return false;
    }

    try {
      const res = await fetch(`${apiConfig.gatewayUrl}${endpoints.refresh}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: session.refreshToken,
          tenantId: session.user.tenantId,
          tenantSlug: session.user.tenantSlug,
          firmaKodu: session.firmaKodu,
        }),
      });

      if (!res.ok) {
        clearSession();
        return false;
      }

      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };

      if (!data.accessToken) {
        clearSession();
        return false;
      }

      saveSession({
        ...session,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? session.refreshToken,
      });
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

function errorMessage(data: unknown, status: number): string {
  if (
    typeof data === "object" &&
    data &&
    "message" in data &&
    typeof (data as { message: unknown }).message === "string"
  ) {
    return (data as { message: string }).message;
  }
  return `İstek başarısız (${status})`;
}

/** Gateway'e istek — 401'de bir kez /auth/refresh dener. */
export async function gatewayFetch<T>(
  path: string,
  opts: FetchOpts = {},
): Promise<T> {
  const { token, tenantId, headers, _retried, ...rest } = opts;
  const session = loadSession();
  const bearer = token ?? session?.accessToken ?? null;
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
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return gatewayFetch<T>(path, { ...opts, token: undefined, _retried: true });
    }
  }

  if (!res.ok) {
    throw new ApiError(errorMessage(data, res.status), res.status, data);
  }

  return data as T;
}

/** Document Agent'a istek. */
export async function documentAgentFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${apiConfig.documentAgentUrl}${path}`, opts);
  const text = await res.text();
  const data = parseBody(text);
  if (!res.ok) {
    throw new ApiError(`Document Agent hatası (${res.status})`, res.status, data);
  }
  return data as T;
}
