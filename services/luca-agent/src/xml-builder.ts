import { escapeXml, formatAmount } from './format.js';
import type { FirmaBilgisi, LucaExportOptions, LucaFis } from './types.js';

const XMLNS = 'https://finatura.app/schemas/luca-fis-aktarim/v1';
const SCHEMA_VERSION = '1.0';

function ind(level: number): string {
  return '  '.repeat(level);
}

function el(level: number, name: string, value: string | number): string {
  return `${ind(level)}<${name}>${escapeXml(String(value))}</${name}>`;
}

/**
 * Luca Fiş Aktarımı alanlarıyla hizalı Finatura XML.
 * Zorunlu satır alanları (Excel Veri Aktarımı ile aynı):
 * FisNo, FisTarihi, HesapKodu, Borc, Alacak.
 */
export function buildLucaXml(
  firma: FirmaBilgisi,
  fisler: LucaFis[],
  options?: Pick<LucaExportOptions, 'metaYaz'>,
): string {
  const metaYaz = options?.metaYaz !== false;
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<LucaFisAktarim versiyon="${SCHEMA_VERSION}" xmlns="${XMLNS}">`,
  ];

  if (metaYaz) {
    out.push(`${ind(1)}<Meta>`);
    out.push(el(2, 'Uretici', 'Finatura Luca Agent'));
    out.push(el(2, 'UretilmeZamani', new Date().toISOString()));
    out.push(el(2, 'Amac', 'Yevmiye fisi aktarimi (e-Fatura, gider pusulasi, banka)'));
    out.push(`${ind(1)}</Meta>`);
  }

  out.push(`${ind(1)}<Firma>`);
  out.push(el(2, 'Unvan', firma.unvan));
  out.push(el(2, 'Vkn', firma.vkn));
  out.push(`${ind(1)}</Firma>`);

  out.push(`${ind(1)}<Donem>`);
  out.push(el(2, 'Yil', firma.donemYil));
  out.push(el(2, 'Ay', String(firma.donemAy).padStart(2, '0')));
  out.push(`${ind(1)}</Donem>`);

  out.push(`${ind(1)}<Fisler>`);
  for (const fis of fisler) {
    out.push(...serializeFis(fis, 2));
  }
  out.push(`${ind(1)}</Fisler>`);
  out.push('</LucaFisAktarim>');
  return out.join('\n') + '\n';
}

function serializeFis(fis: LucaFis, level: number): string[] {
  const o: string[] = [
    `${ind(level)}<Fis>`,
    el(level + 1, 'FisNo', fis.fisNo),
    el(level + 1, 'FisTarihi', fis.fisTarihi),
    el(level + 1, 'FisTipi', fis.fisTipi),
    el(level + 1, 'FisKodu', fis.fisKodu),
    el(level + 1, 'BelgeTuru', fis.belgeTuru),
    el(level + 1, 'Aciklama', fis.aciklama),
    el(level + 1, 'Kaynak', fis.kaynak),
    el(level + 1, 'KaynakId', fis.kaynakId),
    `${ind(level + 1)}<Satirlar>`,
  ];

  for (const s of fis.satirlar) {
    o.push(`${ind(level + 2)}<Satir>`);
    o.push(el(level + 3, 'SiraNo', s.siraNo));
    o.push(el(level + 3, 'HesapKodu', s.hesapKodu));
    if (s.hesapAdi) o.push(el(level + 3, 'HesapAdi', s.hesapAdi));
    if (s.evrakNo) o.push(el(level + 3, 'EvrakNo', s.evrakNo));
    if (s.evrakTarihi) o.push(el(level + 3, 'EvrakTarihi', s.evrakTarihi));
    o.push(el(level + 3, 'Aciklama', s.aciklama));
    o.push(el(level + 3, 'Borc', formatAmount(s.borc)));
    o.push(el(level + 3, 'Alacak', formatAmount(s.alacak)));
    if (s.miktar != null) o.push(el(level + 3, 'Miktar', formatAmount(s.miktar)));
    o.push(`${ind(level + 2)}</Satir>`);
  }

  o.push(`${ind(level + 1)}</Satirlar>`);
  o.push(`${ind(level)}</Fis>`);
  return o;
}
