import { resolveAccountMap, withCariEki } from '../account-map.js';
import { roundMoney, toDateOnly } from '../format.js';
import type {
  AccountMap,
  ExportKaynak,
  InvoiceInput,
  LucaBelgeTuru,
  LucaExportOptions,
  LucaFis,
  LucaFisSatir,
} from '../types.js';

function belgeTuru(kind: InvoiceInput['kind']): LucaBelgeTuru {
  if (kind === 'gider_pusulasi') return 'Gider Pusulasi';
  if (kind === 'earsiv') return 'e-Arsiv';
  return 'e-Fatura';
}

function kaynak(kind: InvoiceInput['kind']): ExportKaynak {
  if (kind === 'gider_pusulasi') return 'gider_pusulasi';
  if (kind === 'earsiv') return 'earsiv';
  return 'efatura';
}

function counterpartyLabel(inv: InvoiceInput): string {
  const title = inv.counterpartyTitle?.trim() || 'Cari';
  const vkn = inv.counterpartyVkn?.trim();
  return vkn ? `${title} (${vkn})` : title;
}

function line(
  siraNo: number,
  hesapKodu: string,
  hesapAdi: string,
  borc: number,
  alacak: number,
  aciklama: string,
  evrakNo?: string,
  evrakTarihi?: string,
): LucaFisSatir {
  return {
    siraNo,
    hesapKodu,
    hesapAdi,
    borc: roundMoney(borc),
    alacak: roundMoney(alacak),
    aciklama,
    evrakNo,
    evrakTarihi,
  };
}

/**
 * e-Fatura / e-Arşiv satış:
 *   120 Alıcılar          Borç  grand
 *   600 Yurtiçi Satışlar  Alacak net
 *   391 Hesaplanan KDV    Alacak vat
 *
 * e-Fatura / e-Arşiv alış:
 *   153 Ticari Mallar     Borç net
 *   191 İndirilecek KDV   Borç vat
 *   320 Satıcılar         Alacak grand
 */
export function invoiceToFis(
  inv: InvoiceInput,
  fisNo: number,
  options: Pick<LucaExportOptions, 'accountMap'>,
): LucaFis {
  const map = resolveAccountMap(options.accountMap);
  const tarih = toDateOnly(inv.issueDate);
  const evrakNo = inv.documentNumber?.trim() || inv.uuidEttn || inv.id;
  const cari = counterpartyLabel(inv);
  const aciklama = `${belgeTuru(inv.kind)} ${evrakNo} — ${cari}`;

  const satirlar =
    inv.direction === 'sales'
      ? buildSalesLines(inv, map, aciklama, evrakNo, tarih)
      : buildPurchaseLines(inv, map, aciklama, evrakNo, tarih);

  return {
    fisNo,
    fisTarihi: tarih,
    fisTipi: 'Mahsup',
    fisKodu: 'MM',
    belgeTuru: belgeTuru(inv.kind),
    aciklama,
    kaynak: kaynak(inv.kind),
    kaynakId: inv.id,
    satirlar,
  };
}

function buildSalesLines(
  inv: InvoiceInput,
  map: AccountMap,
  aciklama: string,
  evrakNo: string,
  tarih: string,
): LucaFisSatir[] {
  const alici = withCariEki(map.alicilar, inv.cariHesapEki);
  const lines: LucaFisSatir[] = [
    line(1, alici, 'Alıcılar', inv.grandTotal, 0, aciklama, evrakNo, tarih),
    line(2, map.yurticiSatislar, 'Yurtiçi Satışlar', 0, inv.netTotal, aciklama, evrakNo, tarih),
  ];
  if (roundMoney(inv.vatTotal) > 0) {
    lines.push(
      line(3, map.hesaplananKdv, 'Hesaplanan KDV', 0, inv.vatTotal, aciklama, evrakNo, tarih),
    );
  }
  return lines;
}

function buildPurchaseLines(
  inv: InvoiceInput,
  map: AccountMap,
  aciklama: string,
  evrakNo: string,
  tarih: string,
): LucaFisSatir[] {
  const satici = withCariEki(map.saticilar, inv.cariHesapEki);
  const lines: LucaFisSatir[] = [
    line(1, map.ticariMallar, 'Ticari Mallar', inv.netTotal, 0, aciklama, evrakNo, tarih),
  ];
  let sira = 2;
  if (roundMoney(inv.vatTotal) > 0) {
    lines.push(
      line(sira++, map.indirilecekKdv, 'İndirilecek KDV', inv.vatTotal, 0, aciklama, evrakNo, tarih),
    );
  }
  lines.push(
    line(sira, satici, 'Satıcılar', 0, inv.grandTotal, aciklama, evrakNo, tarih),
  );
  return lines;
}

/**
 * Gider pusulası (şahıstan alış — galeri araç / emlak kaynaklı):
 *   153 Ticari Mallar     Borç  bruto (net + stopaj; KDV yoksa matrah)
 *   320 Satıcılar         Alacak ödenecek (grand veya net - stopaj)
 *   360 Ödenecek Vergi    Alacak stopaj
 *
 * Stopaj: inv.stopajAmount veya net × oran.
 * grandTotal = ödenecek net (stopaj düşülmüş) kabul edilir;
 * yoksa net − stopaj kullanılır.
 */
export function giderPusulasiToFis(
  inv: InvoiceInput,
  fisNo: number,
  options: Pick<LucaExportOptions, 'accountMap' | 'varsayilanStopajOrani'>,
): LucaFis {
  const map = resolveAccountMap(options.accountMap);
  const tarih = toDateOnly(inv.issueDate);
  const evrakNo = inv.documentNumber?.trim() || inv.id;
  const cari = counterpartyLabel(inv);
  const aciklama = `Gider Pusulası ${evrakNo} — ${cari}`;

  const oran = options.varsayilanStopajOrani ?? 0.2;
  let stopaj =
    inv.stopajAmount != null
      ? roundMoney(inv.stopajAmount)
      : roundMoney(inv.netTotal * (inv.stopajRate ?? oran));

  // Matrah + stopaj = stok maliyeti; ödenecek = grand veya net−stopaj
  const odenecek =
    inv.grandTotal > 0 && roundMoney(inv.grandTotal) !== roundMoney(inv.netTotal)
      ? roundMoney(inv.grandTotal)
      : roundMoney(inv.netTotal - stopaj);

  // Denge: maliyet = odenecek + stopaj
  const maliyet = roundMoney(odenecek + stopaj);
  // Stopaj tutarını dengeye sabitle
  stopaj = roundMoney(maliyet - odenecek);

  const satici = withCariEki(map.saticilar, inv.cariHesapEki);
  const satirlar: LucaFisSatir[] = [
    line(1, map.ticariMallar, 'Ticari Mallar', maliyet, 0, aciklama, evrakNo, tarih),
    line(2, satici, 'Satıcılar', 0, odenecek, aciklama, evrakNo, tarih),
  ];
  if (stopaj > 0) {
    satirlar.push(
      line(3, map.odenecekVergi, 'Ödenecek Vergi (Stopaj)', 0, stopaj, aciklama, evrakNo, tarih),
    );
  }

  return {
    fisNo,
    fisTarihi: tarih,
    fisTipi: 'Mahsup',
    fisKodu: 'MM',
    belgeTuru: 'Gider Pusulasi',
    aciklama,
    kaynak: 'gider_pusulasi',
    kaynakId: inv.id,
    satirlar,
  };
}

export function transformInvoice(
  inv: InvoiceInput,
  fisNo: number,
  options: Pick<LucaExportOptions, 'accountMap' | 'varsayilanStopajOrani'>,
): LucaFis {
  if (inv.kind === 'gider_pusulasi') {
    return giderPusulasiToFis(inv, fisNo, options);
  }
  return invoiceToFis(inv, fisNo, options);
}
