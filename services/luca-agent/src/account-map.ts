import type { AccountMap } from './types.js';

/**
 * Galeri / kuyumcu / emlak için makul varsayılan TDHP kodları.
 * Mali müşavir Luca hesap planına göre `Partial<AccountMap>` ile ezilir.
 */
export const DEFAULT_ACCOUNT_MAP: AccountMap = {
  alicilar: '120',
  saticilar: '320',
  yurticiSatislar: '600',
  ticariMallar: '153',
  hesaplananKdv: '391',
  indirilecekKdv: '191',
  odenecekVergi: '360',
  bankalar: '102',
  kasa: '100',
  genelGider: '770',
};

export function resolveAccountMap(override?: Partial<AccountMap>): AccountMap {
  return { ...DEFAULT_ACCOUNT_MAP, ...override };
}

/** Cari eki varsa `120.01.001` gibi alt hesap üretir */
export function withCariEki(anaHesap: string, cariHesapEki?: string | null): string {
  if (!cariHesapEki) return anaHesap;
  const eki = cariHesapEki.trim().replace(/^\.+/, '');
  if (!eki) return anaHesap;
  return `${anaHesap}.${eki}`;
}
