import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';

type RateCategory = 'fx' | 'gold';

export interface MarketRate {
  symbol: string;
  label: string;
  category: RateCategory;
  bid: number;
  ask: number;
  changePercent: number | null;
  updatedAt: string | null;
  source: string;
}

interface RatesSnapshot {
  fx: MarketRate[];
  gold: MarketRate[];
  fetchedAt: string;
  source: string;
  sourceUrl: string;
  demo?: boolean;
}

const ttlMs = numberEnv('RATES_CACHE_TTL_MS', 20_000);
const staleTtlMs = numberEnv('RATES_STALE_TTL_MS', 10 * 60_000);

let cache: RatesSnapshot | null = null;

export const ratesRouter = Router();

ratesRouter.use(tenantContext);

ratesRouter.get('/rates', async (req, res) => {
  const category = normalizeCategory(req.query.category);

  try {
    const snapshot = await getRatesSnapshot();
    res.json(responseFor(snapshot, category, false));
  } catch (err) {
    if (cache && Date.now() - Date.parse(cache.fetchedAt) <= staleTtlMs) {
      res.json({
        ...responseFor(cache, category, true),
        warning:
          'Canlı kaynak anlık olarak okunamadı; son başarılı veri gösteriliyor.',
      });
      return;
    }

    console.error('[rates]', err);
    res.status(503).json({
      error: 'rates_unavailable',
      message:
        'Kur ve altın verisi alınamadı. TRUNCGIL_RATES_URL veya DATSHOP_RATES_URL yapılandırmasını kontrol edin.',
      source: 'rates',
    });
  }
});

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeCategory(value: unknown): RateCategory | null {
  const raw = typeof value === 'string' ? value.toLowerCase() : '';
  return raw === 'fx' || raw === 'gold' ? raw : null;
}

async function getRatesSnapshot(): Promise<RatesSnapshot> {
  if (cache && Date.now() - Date.parse(cache.fetchedAt) <= ttlMs) {
    return cache;
  }

  const providers = [fetchTruncgil, fetchDatshop];
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const snapshot = await provider();
      if (snapshot.fx.length || snapshot.gold.length) {
        cache = snapshot;
        return snapshot;
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('rates_unavailable');
}

async function fetchTruncgil(): Promise<RatesSnapshot> {
  const url =
    process.env.TRUNCGIL_RATES_URL?.trim() ||
    'https://finans.truncgil.com/v4/today.json';
  const upstream = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok) throw new Error(`truncgil ${upstream.status}`);
  const json = (await upstream.json()) as Record<string, unknown>;
  const mapped = mapTruncgilLike(json, 'finans.truncgil.com', url);
  return mapped;
}

async function fetchDatshop(): Promise<RatesSnapshot> {
  const url = process.env.DATSHOP_RATES_URL?.trim() || 'https://datshop.com.tr';
  const upstream = await fetch(url, {
    headers: {
      accept: 'text/html,application/json',
      'user-agent':
        'FinaturaRatesBot/1.0 (+https://finatura.app; source=datshop.com.tr)',
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok) throw new Error(`datshop ${upstream.status}`);
  const raw = await upstream.text();
  const parsed = parseDatshopRatesPayload(
    raw,
    upstream.headers.get('content-type') ?? '',
  );
  return {
    fx: parsed.fx,
    gold: parsed.gold,
    fetchedAt: new Date().toISOString(),
    source: 'datshop.com.tr',
    sourceUrl: url,
  };
}

function mapTruncgilLike(
  json: Record<string, unknown>,
  source: string,
  sourceUrl: string,
): RatesSnapshot {
  const updatedAt =
    typeof json.Update_Date === 'string' ? json.Update_Date : null;
  const fx: MarketRate[] = [];
  const gold: MarketRate[] = [];

  for (const [key, value] of Object.entries(json)) {
    if (key === 'Update_Date' || !isRecord(value)) continue;
    const type = String(value.Type ?? value.type ?? '').toLowerCase();
    const bid = parseDecimal(value.Buying ?? value.buying ?? value.alis);
    const ask = parseDecimal(value.Selling ?? value.selling ?? value.satis);
    if (!Number.isFinite(bid) || !Number.isFinite(ask)) continue;
    const isGold =
      type.includes('gold') ||
      type.includes('altin') ||
      /altin|gram|ceyrek|ons|ayar/i.test(key);
    const isFx =
      type.includes('currency') ||
      type.includes('doviz') ||
      /USD|EUR|GBP|CHF|SAR/i.test(key);
    if (!isGold && !isFx) continue;
    const symbol = isGold
      ? key.replace(/\s+/g, '').toUpperCase()
      : /^[A-Z]{3}$/i.test(key)
        ? `${key.toUpperCase()}TRY`
        : key.toUpperCase();
    const rate: MarketRate = {
      symbol,
      label: key.replace(/[_-]/g, ' ').toUpperCase(),
      category: isGold ? 'gold' : 'fx',
      bid,
      ask,
      changePercent: parseOptionalDecimal(value.Change ?? value.change),
      updatedAt,
      source,
    };
    if (isGold) gold.push(rate);
    else fx.push(rate);
  }

  return {
    fx,
    gold,
    fetchedAt: new Date().toISOString(),
    source,
    sourceUrl,
  };
}

function responseFor(
  snapshot: RatesSnapshot,
  category: RateCategory | null,
  stale: boolean,
) {
  const rates = category
    ? snapshot[category]
    : [...snapshot.fx, ...snapshot.gold];
  return {
    items: rates,
    fx: snapshot.fx,
    gold: snapshot.gold,
    count: rates.length,
    category,
    source: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    fetchedAt: snapshot.fetchedAt,
    stale,
    disclaimer: `Fiyatlar bilgilendirme amaçlıdır. Kaynak ${snapshot.source}.`,
  };
}

export function parseDatshopRatesPayload(
  raw: string,
  contentType = '',
): { fx: MarketRate[]; gold: MarketRate[] } {
  const candidates: unknown[] = [];
  if (contentType.includes('json') || raw.trim().startsWith('{')) {
    try {
      candidates.push(JSON.parse(raw));
    } catch {
      // ignore
    }
  } else {
    for (const json of extractJsonBlocks(raw)) {
      try {
        candidates.push(JSON.parse(json));
      } catch {
        // ignore
      }
    }
  }

  for (const candidate of candidates) {
    if (isRecord(candidate) && candidate.Update_Date) {
      const mapped = mapTruncgilLike(
        candidate,
        'finans.truncgil.com',
        'truncgil',
      );
      return { fx: mapped.fx, gold: mapped.gold };
    }
  }

  const flattened = candidates.flatMap((candidate) =>
    collectRateItems(candidate),
  );
  const mapped = flattened
    .map((item) => mapDatshopRate(item.raw, item.category))
    .filter((item): item is MarketRate => item !== null);

  return {
    fx: dedupe(mapped.filter((item) => item.category === 'fx')),
    gold: dedupe(mapped.filter((item) => item.category === 'gold')),
  };
}

function extractJsonBlocks(html: string): string[] {
  const blocks: string[] = [];
  const nextData = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (nextData?.[1]) blocks.push(nextData[1].trim());

  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    if (script[1]) blocks.push(script[1].trim());
  }
  return blocks;
}

function collectRateItems(
  value: unknown,
  hint: RateCategory | null = null,
): Array<{ raw: Record<string, unknown>; category: RateCategory }> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRateItems(item, hint));
  }

  if (!isRecord(value)) return [];

  const directCategory = inferCategory(value, hint);
  if (directCategory && looksLikeRate(value)) {
    return [{ raw: value, category: directCategory }];
  }

  const items: Array<{ raw: Record<string, unknown>; category: RateCategory }> =
    [];
  for (const [key, child] of Object.entries(value)) {
    const nextHint = /doviz|currency|exchange|fx/i.test(key)
      ? 'fx'
      : /altin|gold|kiymetli|metal/i.test(key)
        ? 'gold'
        : hint;
    items.push(...collectRateItems(child, nextHint));
  }
  return items;
}

function inferCategory(
  row: Record<string, unknown>,
  hint: RateCategory | null,
): RateCategory | null {
  if (hint) return hint;
  const type = String(
    row.type ?? row.Type ?? row.category ?? row.group ?? row.market ?? '',
  ).toLowerCase();
  if (/currency|doviz|exchange|fx/.test(type)) return 'fx';
  if (/gold|altin|maden|sarrafiye|metal/.test(type)) return 'gold';

  const symbol = String(row.symbol ?? row.code ?? row.name ?? row.title ?? '');
  if (/try$|usdtry|eurtry|gbptry|chftry/i.test(symbol)) return 'fx';
  if (/altin|gold|ons|ayar|ceyrek|gram|gumus|kg/i.test(symbol)) return 'gold';
  return null;
}

function looksLikeRate(row: Record<string, unknown>): boolean {
  return (
    firstValue(row, ['bid', 'buy', 'Buying', 'alis', 'Alış']) != null &&
    firstValue(row, ['ask', 'sell', 'Selling', 'satis', 'Satış']) != null
  );
}

export function mapDatshopRate(
  row: Record<string, unknown>,
  categoryHint: RateCategory,
): MarketRate | null {
  const symbol = String(
    firstValue(row, ['symbol', 'code', 'kod', 'parite']) ?? '',
  )
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
  const label = String(
    firstValue(row, ['label', 'title', 'name', 'baslik', 'Birim']) ?? symbol,
  ).trim();
  const bid = parseDecimal(
    firstValue(row, ['bid', 'buy', 'Buying', 'alis', 'Alış']),
  );
  const ask = parseDecimal(
    firstValue(row, ['ask', 'sell', 'Selling', 'satis', 'Satış']),
  );

  if (!symbol || !Number.isFinite(bid) || !Number.isFinite(ask)) return null;

  return {
    symbol,
    label: label || symbol,
    category: categoryHint,
    bid,
    ask,
    changePercent: parseOptionalDecimal(
      firstValue(row, [
        'changePercent',
        'change',
        'Change',
        'degisim',
        'Değişim',
      ]),
    ),
    updatedAt:
      stringOrNull(firstValue(row, ['updatedAt', 'tarih', 'date', 'time'])) ??
      null,
    source: 'datshop.com.tr',
  };
}

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  return null;
}

function parseDecimal(value: unknown): number {
  const parsed = parseOptionalDecimal(value);
  return parsed ?? Number.NaN;
}

function parseOptionalDecimal(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace('%', '').trim();
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.includes(',')
        ? cleaned.replace(',', '.')
        : cleaned;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function dedupe(items: MarketRate[]): MarketRate[] {
  const seen = new Map<string, MarketRate>();
  for (const item of items) seen.set(item.symbol, item);
  return [...seen.values()];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
