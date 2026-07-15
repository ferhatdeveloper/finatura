import { resolveAccountMap, withCariEki } from '../account-map.js';
import { toDateOnly } from '../format.js';
import type {
  BankTransactionInput,
  LucaExportOptions,
  LucaFis,
  LucaFisSatir,
} from '../types.js';

/**
 * Gelen havale: 102 Bankalar Borç / 120 Alıcılar Alacak
 * Giden havale: 320 Satıcılar Borç / 102 Bankalar Alacak
 */
export function bankTransactionToFis(
  tx: BankTransactionInput,
  fisNo: number,
  options: Pick<LucaExportOptions, 'accountMap'>,
): LucaFis {
  const map = resolveAccountMap(options.accountMap);
  const tarih = toDateOnly(tx.valueDate || tx.transactionAt);
  // UUID kısa ref: baş + son 4 (benzersiz evrak no)
  const compact = tx.id.replace(/-/g, '');
  const evrakNo = (
    compact.length >= 12
      ? `${compact.slice(0, 8)}${compact.slice(-4)}`
      : compact || tx.id
  ).toUpperCase();
  const tarafli =
    tx.counterpartyName?.trim() ||
    tx.matchedInvoiceDocumentNumber ||
    tx.bankName ||
    'Banka hareketi';
  const aciklama = [tx.description?.trim(), tarafli].filter(Boolean).join(' — ').slice(0, 200);

  const bankaHesap = map.bankalar;
  let satirlar: LucaFisSatir[];

  if (tx.direction === 'inbound') {
    const alici = withCariEki(map.alicilar, tx.cariHesapEki);
    satirlar = [
      {
        siraNo: 1,
        hesapKodu: bankaHesap,
        hesapAdi: 'Bankalar',
        borc: tx.amount,
        alacak: 0,
        aciklama,
        evrakNo,
        evrakTarihi: tarih,
      },
      {
        siraNo: 2,
        hesapKodu: alici,
        hesapAdi: 'Alıcılar',
        borc: 0,
        alacak: tx.amount,
        aciklama,
        evrakNo,
        evrakTarihi: tarih,
      },
    ];
  } else {
    const satici = withCariEki(map.saticilar, tx.cariHesapEki);
    satirlar = [
      {
        siraNo: 1,
        hesapKodu: satici,
        hesapAdi: 'Satıcılar',
        borc: tx.amount,
        alacak: 0,
        aciklama,
        evrakNo,
        evrakTarihi: tarih,
      },
      {
        siraNo: 2,
        hesapKodu: bankaHesap,
        hesapAdi: 'Bankalar',
        borc: 0,
        alacak: tx.amount,
        aciklama,
        evrakNo,
        evrakTarihi: tarih,
      },
    ];
  }

  return {
    fisNo,
    fisTarihi: tarih,
    fisTipi: 'Mahsup',
    fisKodu: 'MM',
    belgeTuru: 'Banka',
    aciklama: aciklama || `Banka ${tx.direction}`,
    kaynak: tx.direction === 'inbound' ? 'banka_gelen' : 'banka_giden',
    kaynakId: tx.id,
    satirlar,
  };
}
