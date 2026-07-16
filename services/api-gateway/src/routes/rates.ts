import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
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
  demo: boolean;
}

const ttlMs = numberEnv('RATES_CACHE_TTL_MS', 30_000);
const staleTtlMs = numberEnv('RATES_STALE_TTL_MS', 15 * 60_000);

let cache: RatesSnapshot | null = null;

/**
 * Kur/altın — tenant-router'a bağımlı değil.
 * Gateway doğrudan dış kaynak çeker (truncgil → datshop → işaretli demo).
 */
export const ratesRouter = Router();

ratesRouter.get(
  ['/v1/rates', '/v1/tenant/rates'],
  requireAuth,
  tenantContext,
  async (req, res) => {
    const category = normalizeCategory(req.query.category);

    try {
      const snapshot = await getRatesSnapshot();
      res.json(responseFor(snapshot, category, false));
    } catch (err) {
      if (cache && Date.now() - Date.parse(cache.fetchedAt) <= staleTtlMs) {
        res.json({
          ...responseFor(cache, category, true),
          warning:
            'Canlı kaynak geçici olarak okunamadı; son başarılı kur verisi gösteriliyor.',
        });
        return;
      }

      console.error('[gateway-rates]', err);
      const demo = buildDemoSnapshot();
      cache = demo;
      res.json({
        ...responseFor(demo, category, true),
        warning:
          'Canlı kur kaynağına ulaşılamadı. Bilgilendirme amaçlı örnek (demo) fiyatlar gösteriliyor.',
      });
    }
  },
);

async function getRatesSnapshot(): Promise<RatesSnapshot> {
  if (cache && Date.now() - Date.parse(cache.fetchedAt) <= ttlMs) {
    return cache;
  }

  const providers: Array<() => Promise<RatesSnapshot>> = [
    fetchFromCustomUrl,
    fetchFromTruncgil,
    fetchFromDatshop,
  ];

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const snapshot = await provider();
      if (snapshot.fx.length > 0 || snapshot.gold.length > 0) {
        cache = snapshot;
        return snapshot;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('rates_providers_failed');
}

async function fetchFromCustomUrl(): Promise<RatesSnapshot> {
  const url = process.env.RATES_SOURCE_URL?.trim();
  if (!url) throw new Error('RATES_SOURCE_URL unset');

  const upstream = await fetch(url, {
    headers: { accept: 'application/json,text/html' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok) throw new Error(`custom ${upstream.status}`);
  const raw = await upstream.text();
  const ct = upstream.headers.get('content-type') ?? '';
  const parsed = parseAnyRatesPayload(raw, ct, url);
  return {
    ...parsed,
    fetchedAt: new Date().toISOString(),
    source: hostOf(url),
    sourceUrl: url,
    demo: false,
  };
}

async function fetchFromTruncgil(): Promise<RatesSnapshot> {
  const url =
    process.env.TRUNCGIL_RATES_URL?.trim() ||
    'https://finans.truncgil.com/v4/today.json';
  const upstream = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok) throw new Error(`truncgil ${upstream.status}`);
  const json = (await upstream.json()) as Record<string, unknown>;
  return mapTruncgil(json, url);
}

async function fetchFromDatshop(): Promise<RatesSnapshot> {
  const url = process.env.DATSHOP_RATES_URL?.trim() || 'https://datshop.com.tr';
  const upstream = await fetch(url, {
    headers: {
      accept: 'text/html,application/json',
      'user-agent':
        'FinaturaRatesBot/1.0 (+https://finatura.app; informational)',
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok) throw new Error(`datshop ${upstream.status}`);
  const raw = await upstream.text();
  const ct = upstream.headers.get('content-type') ?? '';
  const parsed = parseAnyRatesPayload(raw, ct, url);
  return {
    ...parsed,
    fetchedAt: new Date().toISOString(),
    source: 'datshop.com.tr',
    sourceUrl: url,
    demo: false,
  };
}

export function mapTruncgil(
  json: Record<string, unknown>,
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

    const change = parseOptionalDecimal(
      value.Change ?? value.change ?? value.Degisim,
    );
    const isGold =
      type.includes('gold') ||
      type.includes('altin') ||
      /altin|gram|ceyrek|yarim|tam|ata|ons|gumus|ayar/i.test(key);
    const isFx =
      type.includes('currency') ||
      type.includes('doviz') ||
      /USD|EUR|GBP|CHF|JPY|SAR|AUD|CAD/i.test(key);

    const rate: MarketRate = {
      symbol: normalizeSymbol(key, isGold),
      label: humanLabel(key),
      category: isGold ? 'gold' : 'fx',
      bid,
      ask,
      changePercent: change,
      updatedAt,
      source: 'finans.truncgil.com',
    };

    if (isGold) gold.push(rate);
    else if (isFx) fx.push(rate);
  }

  return {
    fx: orderFx(fx),
    gold: orderGold(gold),
    fetchedAt: new Date().toISOString(),
    source: 'finans.truncgil.com',
    sourceUrl,
    demo: false,
  };
}

function parseAnyRatesPayload(
  raw: string,
  contentType: string,
  sourceUrl: string,
): Omit<RatesSnapshot, 'fetchedAt' | 'source' | 'sourceUrl' | 'demo'> {
  const candidates: unknown[] = [];
  if (contentType.includes('json') || raw.trim().startsWith('{')) {
    try {
      candidates.push(JSON.parse(raw));
    } catch {
      // ignore
    }
  }
  for (const block of extractJsonBlocks(raw)) {
    try {
      candidates.push(JSON.parse(block));
    } catch {
      // ignore
    }
  }

  for (const candidate of candidates) {
    if (isRecord(candidate) && candidate.Update_Date) {
      const mapped = mapTruncgil(candidate, sourceUrl);
      return { fx: mapped.fx, gold: mapped.gold };
    }
  }

  const items = candidates.flatMap((c) => collectRateItems(c));
  return {
    fx: orderFx(items.filter((i) => i.category === 'fx')),
    gold: orderGold(items.filter((i) => i.category === 'gold')),
  };
}

function collectRateItems(
  value: unknown,
  hint: RateCategory | null = null,
): MarketRate[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRateItems(item, hint));
  }
  if (!isRecord(value)) return [];

  const category = inferCategory(value, hint);
  const bid = parseDecimal(
    firstValue(value, ['bid', 'buy', 'Buying', 'alis', 'Alış']),
  );
  const ask = parseDecimal(
    firstValue(value, ['ask', 'sell', 'Selling', 'satis', 'Satış']),
  );
  const symbol = String(
    firstValue(value, ['symbol', 'code', 'kod', 'parite']) ?? '',
  )
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

  if (category && symbol && Number.isFinite(bid) && Number.isFinite(ask)) {
    return [
      {
        symbol,
        label: String(
          firstValue(value, ['label', 'title', 'name', 'baslik']) ?? symbol,
        ),
        category,
        bid,
        ask,
        changePercent: parseOptionalDecimal(
          firstValue(value, [
            'changePercent',
            'change',
            'Change',
            'degisim',
            'Değişim',
          ]),
        ),
        updatedAt: stringOrNull(
          firstValue(value, ['updatedAt', 'tarih', 'date', 'time']),
        ),
        source: hostOf(process.env.DATSHOP_RATES_URL || 'datshop.com.tr'),
      },
    ];
  }

  const out: MarketRate[] = [];
  for (const [key, child] of Object.entries(value)) {
    const nextHint = /doviz|currency|fx/i.test(key)
      ? 'fx'
      : /altin|gold|metal/i.test(key)
        ? 'gold'
        : hint;
    out.push(...collectRateItems(child, nextHint));
  }
  return out;
}

function extractJsonBlocks(html: string): string[] {
  const blocks: string[] = [];
  const nextData = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (nextData?.[1]) blocks.push(nextData[1].trim());
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    if (match[1]) blocks.push(match[1].trim());
  }
  return blocks;
}

function buildDemoSnapshot(): RatesSnapshot {
  const now = new Date().toISOString();
  const fx: MarketRate[] = [
    demoRate('USDTRY', 'Amerikan Doları', 'fx', 40.18, 40.22, 0.12),
    demoRate('EURTRY', 'Euro', 'fx', 43.55, 43.62, -0.08),
    demoRate('GBPTRY', 'Sterlin', 'fx', 51.1, 51.35, 0.21),
    demoRate('CHFTRY', 'İsviçre Frangı', 'fx', 45.8, 46.05, 0.05),
    demoRate('SARTRY', 'Suudi Riyali', 'fx', 10.7, 10.78, 0.04),
  ];
  const gold: MarketRate[] = [
    demoRate('HASALTIN', 'HAS ALTIN', 'gold', 4285, 4305, 0.18),
    demoRate('ONS', 'ONS', 'gold', 3320, 3328, 0.1),
    demoRate('USDKG', 'USD KG', 'gold', 106700, 107050, 0.09),
    demoRate('EURKG', 'EUR KG', 'gold', 98750, 99120, -0.05),
    demoRate('AYAR22', '22 AYAR', 'gold', 3960, 4010, 0.15),
    demoRate('GRAMALTIN', 'GRAM ALTIN', 'gold', 4310, 4340, -0.08),
    demoRate('ALTINGUMUS', 'ALTIN GÜMÜŞ', 'gold', 48.2, 49.1, 0.22),
    demoRate('YENICEYREK', 'YENİ ÇEYREK', 'gold', 7020, 7180, 0.14),
    demoRate('ESKICEYREK', 'ESKİ ÇEYREK', 'gold', 6880, 7020, 0.11),
    demoRate('YENIYARIM', 'YENİ YARIM', 'gold', 14040, 14360, 0.13),
    demoRate('YENITAM', 'YENİ TAM', 'gold', 28080, 28720, 0.12),
  ];

  return {
    fx,
    gold,
    fetchedAt: now,
    source: 'demo',
    sourceUrl: 'demo://finatura-rates',
    demo: true,
  };
}

function demoRate(
  symbol: string,
  label: string,
  category: RateCategory,
  bid: number,
  ask: number,
  changePercent: number,
): MarketRate {
  return {
    symbol,
    label,
    category,
    bid,
    ask,
    changePercent,
    updatedAt: new Date().toISOString(),
    source: 'demo',
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
    demo: snapshot.demo,
    disclaimer: snapshot.demo
      ? 'Demo fiyatlar — bilgilendirme amaçlıdır, işlem için kullanmayın.'
      : `Fiyatlar bilgilendirme amaçlıdır. Kaynak ${snapshot.source}.`,
  };
}

function normalizeCategory(value: unknown): RateCategory | null {
  const raw = typeof value === 'string' ? value.toLowerCase() : '';
  return raw === 'fx' || raw === 'gold' ? raw : null;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSymbol(key: string, isGold: boolean): string {
  const cleaned = key.replace(/\s+/g, '').toUpperCase();
  if (isGold) return cleaned;
  if (/^[A-Z]{3}$/.test(cleaned)) return `${cleaned}TRY`;
  return cleaned;
}

function humanLabel(key: string): string {
  const map: Record<string, string> = {
    USD: 'Amerikan Doları',
    EUR: 'Euro',
    GBP: 'Sterlin',
    CHF: 'İsviçre Frangı',
    SAR: 'Suudi Riyali',
    gram_altin: 'GRAM ALTIN',
    Gram_Altin: 'GRAM ALTIN',
    ceyrek_altin: 'YENİ ÇEYREK',
    yarim_altin: 'YENİ YARIM',
    tam_altin: 'YENİ TAM',
    Ons: 'ONS',
    ONS: 'ONS',
  };
  return map[key] ?? key.replace(/_/g, ' ').toUpperCase();
}

function orderFx(items: MarketRate[]): MarketRate[] {
  const order = ['USDTRY', 'EURTRY', 'GBPTRY', 'CHFTRY', 'SARTRY', 'JPYTRY'];
  return sortByOrder(items, order);
}

function orderGold(items: MarketRate[]): MarketRate[] {
  const order = [
    'HASALTIN',
    'ONS',
    'USDKG',
    'EURKG',
    'AYAR22',
    'GRAMALTIN',
    'ALTINGUMUS',
    'YENICEYREK',
    'ESKICEYREK',
    'YENIYARIM',
    'YENITAM',
  ];
  return sortByOrder(items, order);
}

function sortByOrder(items: MarketRate[], order: string[]): MarketRate[] {
  const rank = new Map(order.map((s, i) => [s, i]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.symbol) ?? 999;
    const rb = rank.get(b.symbol) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.symbol.localeCompare(b.symbol);
  });
}

function inferCategory(
  row: Record<string, unknown>,
  hint: RateCategory | null,
): RateCategory | null {
  if (hint) return hint;
  const type = String(
    row.type ?? row.Type ?? row.category ?? row.group ?? '',
  ).toLowerCase();
  if (/currency|doviz|fx/.test(type)) return 'fx';
  if (/gold|altin|maden|sarrafiye/.test(type)) return 'gold';
  const symbol = String(row.symbol ?? row.code ?? row.name ?? '');
  if (/try$|usdtry|eurtry/i.test(symbol)) return 'fx';
  if (/altin|gold|ons|ayar|ceyrek|gram/i.test(symbol)) return 'gold';
  return null;
}

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  return null;
}

function parseDecimal(value: unknown): number {
  return parseOptionalDecimal(value) ?? Number.NaN;
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

function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
