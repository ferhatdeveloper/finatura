export function formatTry(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function statusLabel(
  status: string,
): { label: string; tone: "ok" | "warn" | "muted" | "danger" } {
  switch (status) {
    case "unmatched":
      return { label: "Açık", tone: "warn" };
    case "matched":
      return { label: "Eşleşti", tone: "ok" };
    case "ignored":
      return { label: "Yoksayıldı", tone: "muted" };
    case "draft":
      return { label: "Taslak", tone: "muted" };
    case "ready":
      return { label: "Gönderime hazır", tone: "warn" };
    case "sent":
      return { label: "Gönderildi", tone: "ok" };
    default:
      return { label: status, tone: "muted" };
  }
}
