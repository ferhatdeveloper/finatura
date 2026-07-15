/** Para tutarı: iki ondalık, nokta ayırıcı (Luca Excel/XML aktarımı) */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0.00';
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** YYYY-MM-DD — timestamptz veya Date kabul eder */
export function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Geçersiz tarih: ${value}`);
  }
  return d.toISOString().slice(0, 10);
}

/** Luca ekranında sık kullanılan GG.AA.YYYY (dokümantasyon / isteğe bağlı) */
export function toLucaDisplayDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}.${m}.${y}`;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function amountsEqual(a: number, b: number, epsilon = 0.005): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) <= epsilon;
}
