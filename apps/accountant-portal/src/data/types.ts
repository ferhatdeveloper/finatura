export type BelgeDurum = "taslak" | "beklemede" | "onaylandi" | "reddedildi";

export interface FaturaKaydi {
  id: string;
  belgeNo: string;
  tarih: string;
  mukellef: string;
  sektor: "Oto Galeri" | "Kuyumculuk" | "Emlak" | string;
  tip: "e-Fatura" | "e-Arşiv" | "Alış" | "Satış" | string;
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

export function formatTRY(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatTarih(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export const DURUM_ETIKET: Record<BelgeDurum, string> = {
  taslak: "Taslak",
  beklemede: "Onay bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};

/** Dönem etiketi — YYYY-MM → Türkçe ay */
export function periodLabel(period?: string): string {
  const raw =
    period ??
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = raw.split("-");
  const months = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  const mi = Number(m) - 1;
  return `${months[mi] ?? m} ${y}`;
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function mapInvoiceStatus(status: string): BelgeDurum {
  switch (status) {
    case "draft":
      return "taslak";
    case "queued":
      return "beklemede";
    case "sent":
    case "accepted":
      return "onaylandi";
    case "rejected":
    case "cancelled":
      return "reddedildi";
    default:
      return "beklemede";
  }
}

export function mapInvoiceKind(kind: string, direction: string): string {
  if (kind === "efatura") return "e-Fatura";
  if (kind === "earsiv") return "e-Arşiv";
  if (kind === "gider_pusulasi") return "Gider Pusulası";
  return direction === "purchase" ? "Alış" : "Satış";
}
