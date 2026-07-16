/**
 * T.C. Kimlik Numarası algoritmik doğrulama (11 hane).
 * İlk hane 0 olamaz; 10. ve 11. hane kontrol basamağıdır.
 */
export function isValidTckn(value: string | null | undefined): boolean {
  if (!value || !/^[1-9][0-9]{10}$/.test(value)) {
    return false;
  }

  const d = value.split('').map(Number);
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
  const evenSum = d[1] + d[3] + d[5] + d[7];
  let digit10 = (oddSum * 7 - evenSum) % 10;
  if (digit10 < 0) digit10 += 10;
  if (d[9] !== digit10) {
    return false;
  }

  const digit11 = (oddSum + evenSum + d[9]) % 10;
  return d[10] === digit11;
}

/** Metinden aday TCKN'leri süz (algoritma filtresiyle; boşluklu OCR dahil). */
export function findValidTckns(text: string): string[] {
  const compactRuns = text.match(/\b[1-9](?:[\s.\-]?\d){10}\b/g) ?? [];
  const plain = text.match(/\b[1-9]\d{10}\b/g) ?? [];
  const candidates = [
    ...compactRuns.map((c) => c.replace(/[\s.\-]/g, '')),
    ...plain,
  ];
  const unique = [...new Set(candidates)];
  return unique.filter(isValidTckn);
}
