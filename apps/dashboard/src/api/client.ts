import { apiConfig } from "./config";

const SESSION_KEY = "finatura.dashboard.session";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
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
};

/** Gateway'e istek (Authorization + X-Tenant-ID hazır). */
export async function gatewayFetch<T>(
  path: string,
  opts: FetchOpts = {},
): Promise<T> {
  const { token, tenantId, headers, ...rest } = opts;
  const res = await fetch(`${apiConfig.gatewayUrl}${path}`, {
    ...rest,
    headers: {
      ...(rest.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
      ...headers,
    },
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
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

/** Document Agent'a istek. */
export async function documentAgentFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${apiConfig.documentAgentUrl}${path}`, opts);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new ApiError(`Document Agent hatası (${res.status})`, res.status, data);
  }
  return data as T;
}
