/**
 * Tek giriş alanı: e-posta | telefon | TCKN | vergi no (VKN).
 * İstemciler `identifier` / `username` / geriye uyumlu `email` gönderir.
 */

export type LoginIdentifierKind =
  | 'email'
  | 'phone'
  | 'tckn'
  | 'vergi_no'
  | 'mixed';

export interface NormalizedLoginIdentifier {
  /** Ham trim edilmiş girdi */
  raw: string;
  /** Tahmini birincil tür (bilgi / log) */
  kind: LoginIdentifierKind;
  /** lower(email) — yalnızca @ içeriyorsa */
  email: string | null;
  /** TR cep normalize: 10 hane 5xxxxxxxxx */
  phoneDigits: string | null;
  /** 11 hane */
  tckn: string | null;
  /** 10 hane VKN */
  vergiNo: string | null;
}

/** Body'den identifier oku (identifier | username | email). */
export function extractLoginIdentifier(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as Record<string, unknown>;
  for (const key of ['identifier', 'username', 'email'] as const) {
    const v = b[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** Yalnızca rakamlar. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * TR telefon normalize:
 * 905551112233 → 5551112233
 * 05551112233  → 5551112233
 * 5551112233   → 5551112233
 */
export function normalizeTrPhoneDigits(rawDigits: string): string | null {
  let d = rawDigits;
  if (!d) return null;
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

export function normalizeLoginIdentifier(
  rawInput: string,
): NormalizedLoginIdentifier {
  const raw = rawInput.trim();
  const digits = digitsOnly(raw);
  const hasAt = raw.includes('@');

  const email = hasAt ? raw.toLowerCase() : null;
  const phoneDigits = !hasAt ? normalizeTrPhoneDigits(digits) : null;
  const tckn = !hasAt && digits.length === 11 ? digits : null;
  // 10 hane: VKN veya cep — her ikisini de dene
  const vergiNo = !hasAt && digits.length === 10 ? digits : null;

  let kind: LoginIdentifierKind = 'mixed';
  if (email) kind = 'email';
  else if (tckn) kind = 'tckn';
  else if (vergiNo && phoneDigits?.startsWith('5')) kind = 'phone';
  else if (vergiNo) kind = 'vergi_no';
  else if (phoneDigits) kind = 'phone';

  return { raw, kind, email, phoneDigits, tckn, vergiNo };
}

/** En az bir lookup anahtarı üretildi mi? */
export function hasLookupKey(id: NormalizedLoginIdentifier): boolean {
  return Boolean(id.email || id.phoneDigits || id.tckn || id.vergiNo);
}
