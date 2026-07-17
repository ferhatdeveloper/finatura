import { BelgeDurum, DURUM_ETIKET } from "../data/types";

export function DurumBadge({ durum }: { durum: BelgeDurum }) {
  return <span className={`badge badge-${durum}`}>{DURUM_ETIKET[durum]}</span>;
}
