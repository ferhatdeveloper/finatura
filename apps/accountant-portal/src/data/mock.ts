export type BelgeDurum = "taslak" | "beklemede" | "onaylandi" | "reddedildi";

export interface FaturaKaydi {
  id: string;
  belgeNo: string;
  tarih: string;
  mukellef: string;
  sektor: "Oto Galeri" | "Kuyumculuk" | "Emlak";
  tip: "e-Fatura" | "e-Arşiv" | "Alış" | "Satış";
  tutar: number;
  kdv: number;
  durum: BelgeDurum;
}

export interface GiderPusulasi {
  id: string;
  pusulaNo: string;
  tarih: string;
  mukellef: string;
  aciklama: string;
  tutar: number;
  stopaj: number;
  durum: BelgeDurum;
}

export interface BankaHareketi {
  id: string;
  tarih: string;
  banka: string;
  aciklama: string;
  tutar: number;
  yon: "giris" | "cikis";
  eslesenBelge?: string;
  mutabik: boolean;
}

export interface OnayBekleyen {
  id: string;
  tip: "Fatura" | "Gider Pusulası" | "Banka Mutabakat";
  referans: string;
  mukellef: string;
  tutar: number;
  tarih: string;
}

export const DONEM = "Temmuz 2026";

export const FATURALAR: FaturaKaydi[] = [
  {
    id: "f1",
    belgeNo: "FTA2026000124",
    tarih: "2026-07-03",
    mukellef: "Anadolu Oto Galeri Ltd.",
    sektor: "Oto Galeri",
    tip: "e-Fatura",
    tutar: 485000,
    kdv: 97000,
    durum: "beklemede",
  },
  {
    id: "f2",
    belgeNo: "FTA2026000131",
    tarih: "2026-07-08",
    mukellef: "Pırlanta Altın Kuyumculuk",
    sektor: "Kuyumculuk",
    tip: "e-Arşiv",
    tutar: 126500,
    kdv: 25300,
    durum: "onaylandi",
  },
  {
    id: "f3",
    belgeNo: "FTA2026000140",
    tarih: "2026-07-11",
    mukellef: "Marmara Emlak Danışmanlık",
    sektor: "Emlak",
    tip: "Satış",
    tutar: 85000,
    kdv: 17000,
    durum: "beklemede",
  },
  {
    id: "f4",
    belgeNo: "FTA2026000152",
    tarih: "2026-07-12",
    mukellef: "Anadolu Oto Galeri Ltd.",
    sektor: "Oto Galeri",
    tip: "Alış",
    tutar: 320000,
    kdv: 64000,
    durum: "taslak",
  },
  {
    id: "f5",
    belgeNo: "FTA2026000160",
    tarih: "2026-07-14",
    mukellef: "Pırlanta Altın Kuyumculuk",
    sektor: "Kuyumculuk",
    tip: "e-Fatura",
    tutar: 74200,
    kdv: 14840,
    durum: "beklemede",
  },
];

export const GIDER_PUSULALARI: GiderPusulasi[] = [
  {
    id: "g1",
    pusulaNo: "GP-2026-0041",
    tarih: "2026-07-02",
    mukellef: "Anadolu Oto Galeri Ltd.",
    aciklama: "İkinci el araç alım — şahıs satici (noter)",
    tutar: 275000,
    stopaj: 5500,
    durum: "beklemede",
  },
  {
    id: "g2",
    pusulaNo: "GP-2026-0042",
    tarih: "2026-07-06",
    mukellef: "Marmara Emlak Danışmanlık",
    aciklama: "Komisyon iadesi — tapu masrafı yansıtma",
    tutar: 18500,
    stopaj: 370,
    durum: "taslak",
  },
  {
    id: "g3",
    pusulaNo: "GP-2026-0045",
    tarih: "2026-07-10",
    mukellef: "Pırlanta Altın Kuyumculuk",
    aciklama: "Hurda altın alış — vergi mükellefi olmayan",
    tutar: 98000,
    stopaj: 1960,
    durum: "onaylandi",
  },
  {
    id: "g4",
    pusulaNo: "GP-2026-0048",
    tarih: "2026-07-13",
    mukellef: "Anadolu Oto Galeri Ltd.",
    aciklama: "Galerici dışı şahıs araç alımı",
    tutar: 410000,
    stopaj: 8200,
    durum: "beklemede",
  },
];

export const BANKA_HAREKETLERI: BankaHareketi[] = [
  {
    id: "b1",
    tarih: "2026-07-03",
    banka: "Ziraat Bankası",
    aciklama: "EFT — araç satışı tahsilatı",
    tutar: 485000,
    yon: "giris",
    eslesenBelge: "FTA2026000124",
    mutabik: true,
  },
  {
    id: "b2",
    tarih: "2026-07-05",
    banka: "Garanti BBVA",
    aciklama: "Havale — tedarikçi ödemesi",
    tutar: 320000,
    yon: "cikis",
    eslesenBelge: undefined,
    mutabik: false,
  },
  {
    id: "b3",
    tarih: "2026-07-08",
    banka: "İş Bankası",
    aciklama: "POS tahsilat — kuyumcu satış",
    tutar: 126500,
    yon: "giris",
    eslesenBelge: "FTA2026000131",
    mutabik: true,
  },
  {
    id: "b4",
    tarih: "2026-07-11",
    banka: "Yapı Kredi",
    aciklama: "EFT — emlak danışmanlık bedeli",
    tutar: 85000,
    yon: "giris",
    eslesenBelge: "FTA2026000140",
    mutabik: false,
  },
  {
    id: "b5",
    tarih: "2026-07-12",
    banka: "Ziraat Bankası",
    aciklama: "Virman — gider pusulası ödemesi",
    tutar: 275000,
    yon: "cikis",
    eslesenBelge: "GP-2026-0041",
    mutabik: true,
  },
];

export const ONAY_BEKLEYENLER: OnayBekleyen[] = [
  {
    id: "o1",
    tip: "Fatura",
    referans: "FTA2026000124",
    mukellef: "Anadolu Oto Galeri Ltd.",
    tutar: 582000,
    tarih: "2026-07-03",
  },
  {
    id: "o2",
    tip: "Gider Pusulası",
    referans: "GP-2026-0041",
    mukellef: "Anadolu Oto Galeri Ltd.",
    tutar: 280500,
    tarih: "2026-07-02",
  },
  {
    id: "o3",
    tip: "Fatura",
    referans: "FTA2026000140",
    mukellef: "Marmara Emlak Danışmanlık",
    tutar: 102000,
    tarih: "2026-07-11",
  },
  {
    id: "o4",
    tip: "Banka Mutabakat",
    referans: "MUT-2026-07-W2",
    mukellef: "Pırlanta Altın Kuyumculuk",
    tutar: 126500,
    tarih: "2026-07-08",
  },
  {
    id: "o5",
    tip: "Gider Pusulası",
    referans: "GP-2026-0048",
    mukellef: "Anadolu Oto Galeri Ltd.",
    tutar: 418200,
    tarih: "2026-07-13",
  },
  {
    id: "o6",
    tip: "Fatura",
    referans: "FTA2026000160",
    mukellef: "Pırlanta Altın Kuyumculuk",
    tutar: 89040,
    tarih: "2026-07-14",
  },
];

export function formatTRY(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatTarih(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export const DURUM_ETIKET: Record<BelgeDurum, string> = {
  taslak: "Taslak",
  beklemede: "Onay bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};
