import { FinteoClientError, type FinteoClient } from './client.js';
import { mapFinteoResponse } from './mapResponse.js';
import type { FinteoFetchParams, FinteoTransaction } from '../types.js';
import { config } from '../config.js';

function buildAuthHeader(): Record<string, string> {
  const key = config.finteo.apiKey;
  if (!key) {
    throw new FinteoClientError('FINTEO_API_KEY tanımlı değil (http modu)');
  }

  const headerName = config.finteo.authHeader;
  const scheme = config.finteo.authScheme;
  const value = scheme ? `${scheme} ${key}` : key;
  return { [headerName]: value };
}

/**
 * Path şablonundaki {accountRef} vb. yer tutucuları doldurur.
 * Hesap yoksa şablondaki segment sadeleştirilir / transactions list path kullanılır.
 */
function buildTransactionsUrl(accountRef: string | undefined, since?: Date): URL {
  const base = config.finteo.apiBaseUrl.replace(/\/+$/, '');
  let path = config.finteo.transactionsPath;

  if (accountRef) {
    path = path.replace(/\{accountRef\}/gi, encodeURIComponent(accountRef));
    path = path.replace(/\{account_ref\}/gi, encodeURIComponent(accountRef));
  } else {
    // Hesap yoksa account-scoped şablon yerine liste endpoint'i
    path = config.finteo.transactionsListPath;
  }

  if (!path.startsWith('/')) path = `/${path}`;
  const url = new URL(`${base}${path}`);

  if (since) {
    url.searchParams.set(config.finteo.sinceQueryParam, since.toISOString());
  }

  const extra = config.finteo.extraQuery;
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  }

  return url;
}

async function fetchJson(url: URL): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.finteo.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...buildAuthHeader(),
      },
      signal: controller.signal,
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new FinteoClientError(
          `Finteo JSON parse hatası (${res.status}) url=${url.pathname}`,
          text.slice(0, 200),
        );
      }
    }

    if (!res.ok) {
      const detail =
        body && typeof body === 'object'
          ? JSON.stringify(body).slice(0, 300)
          : text.slice(0, 300);
      throw new FinteoClientError(
        `Finteo HTTP ${res.status} ${res.statusText} url=${url.pathname}: ${detail}`,
        { status: res.status, body },
      );
    }

    return body;
  } catch (err) {
    if (err instanceof FinteoClientError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FinteoClientError(
        `Finteo zaman aşımı (${config.finteo.timeoutMs}ms) url=${url.pathname}`,
        err,
      );
    }
    throw new FinteoClientError(
      `Finteo ağ hatası url=${url.pathname}: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gerçek Finteo HTTP client.
 * Resmi API sözleşmesi gelene kadar endpoint path / query env ile yapılandırılır.
 * Hata durumunda mock/sandbox'a düşmez — FinteoClientError fırlatır.
 */
export class HttpFinteoClient implements FinteoClient {
  readonly mode = 'http' as const;

  async fetchTransactions(params: FinteoFetchParams): Promise<FinteoTransaction[]> {
    if (!config.finteo.apiKey) {
      throw new FinteoClientError('FINTEO_API_KEY tanımlı değil (http modu)');
    }
    if (!config.finteo.apiBaseUrl) {
      throw new FinteoClientError('FINTEO_API_BASE_URL tanımlı değil (http modu)');
    }

    const refs =
      params.accountRefs && params.accountRefs.length > 0
        ? params.accountRefs
        : [undefined];

    const all: FinteoTransaction[] = [];
    const seen = new Set<string>();

    for (const accountRef of refs) {
      const url = buildTransactionsUrl(accountRef, params.since);
      const body = await fetchJson(url);
      const mapped = mapFinteoResponse(body, {
        fallbackAccountRef: accountRef,
      });

      for (const tx of mapped) {
        const key = `${tx.providerAccountRef}::${tx.providerTxId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(tx);
      }
    }

    if (params.since) {
      return all.filter((tx) => tx.transactionAt >= params.since!);
    }
    return all;
  }
}
