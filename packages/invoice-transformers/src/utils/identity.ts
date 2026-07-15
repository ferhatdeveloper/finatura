/** Kimlik numarasını sadece rakama indirger. */
export function normalizeIdentity(value: string | undefined | null): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function isTckn(value: string): boolean {
  return /^\d{11}$/.test(normalizeIdentity(value));
}

export function isVkn(value: string): boolean {
  return /^\d{10}$/.test(normalizeIdentity(value));
}

/** Şahıs (gerçek kişi) tahmini: 11 haneli TCKN. */
export function isIndividual(value: string): boolean {
  return isTckn(value);
}

export function identitiesMatch(a: string, b: string): boolean {
  const na = normalizeIdentity(a);
  const nb = normalizeIdentity(b);
  return na.length > 0 && na === nb;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Basit ETTN (UUID v4) üretimi — Node crypto. */
export function createEttn(): string {
  return crypto.randomUUID();
}
