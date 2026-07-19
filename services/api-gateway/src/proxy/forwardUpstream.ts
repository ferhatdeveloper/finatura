import type { Request, Response } from 'express';

export interface ForwardUpstreamOptions {
  baseUrl: string;
  /** Upstream path prefix, örn. /api/invoices */
  upstreamPrefix: string;
  /** Mount sonrası path (req.path), örn. /send */
  suffixPath: string;
  /** Query string without leading ? */
  search?: string;
  timeoutMs: number;
  label: string;
  extraHeaders?: Record<string, string>;
}

/**
 * Gateway → downstream HTTP forward. JSON body korunur.
 */
export async function forwardUpstream(
  req: Request,
  res: Response,
  opts: ForwardUpstreamOptions,
): Promise<{ status: number; bodyText: string; json: unknown | null }> {
  const base = opts.baseUrl.replace(/\/$/, '');
  const suffix = opts.suffixPath === '/' ? '' : opts.suffixPath;
  const targetUrl = new URL(`${base}${opts.upstreamPrefix}${suffix}`);
  if (opts.search) {
    targetUrl.search = opts.search.startsWith('?')
      ? opts.search.slice(1)
      : opts.search;
  }

  const headers = new Headers();
  const auth = req.header('authorization');
  if (auth) headers.set('Authorization', auth);

  const contentType = req.header('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  headers.set('X-Forwarded-By', 'api-gateway');
  if (req.auth?.userId) {
    headers.set('X-User-ID', req.auth.userId);
  }

  for (const [k, v] of Object.entries(opts.extraHeaders ?? {})) {
    headers.set(k, v);
  }

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  let body: string | undefined;
  if (hasBody && req.body !== undefined) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    console.error(`[${opts.label}]`, err);
    res.status(502).json({
      error: 'upstream_unreachable',
      message: `${opts.label} servisine ulaşılamadı.`,
    });
    return { status: 502, bodyText: '', json: null };
  }

  const text = await upstream.text();
  let json: unknown | null = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
  }

  return { status: upstream.status, bodyText: text, json };
}

export function sendUpstreamResult(
  res: Response,
  result: { status: number; bodyText: string; json: unknown | null },
  contentType?: string | null,
): void {
  if (res.headersSent) return;
  res.status(result.status);
  if (contentType) res.setHeader('Content-Type', contentType);
  else if (result.json !== null) res.setHeader('Content-Type', 'application/json');

  if (result.bodyText.length === 0) {
    res.end();
    return;
  }
  if (result.json !== null) {
    res.json(result.json);
    return;
  }
  res.send(result.bodyText);
}
