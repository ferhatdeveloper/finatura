/**
 * Mockable HTTP istemci sözleşmesi — live adapter testlerinde
 * gerçek ağa çıkmadan SOAP/REST yanıtı enjekte edilebilir.
 */
export interface HttpRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  /** SOAPAction vb. için */
  timeoutMs?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface HttpClient {
  request(req: HttpRequest): Promise<HttpResponse>;
}

export function createFetchHttpClient(
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): HttpClient {
  return {
    async request(req: HttpRequest): Promise<HttpResponse> {
      const controller = new AbortController();
      const timeout = req.timeoutMs ?? 30_000;
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetchImpl(req.url, {
          method: req.method ?? 'POST',
          headers: req.headers,
          body: req.body,
          signal: controller.signal,
        });

        const body = await res.text();
        const headers: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });

        return { status: res.status, headers, body };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
