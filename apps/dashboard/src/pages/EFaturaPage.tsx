import { useEffect, useState } from "react";
import { fetchEinvoiceDrafts } from "../api/tenant";
import type { EinvoiceDraft } from "../api/mock";
import { formatDateTime, formatTry, statusLabel } from "../lib/format";
import { endpoints } from "../api/config";

export function EFaturaPage() {
  const [items, setItems] = useState<EinvoiceDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEinvoiceDrafts()
      .then((d) => {
        if (!cancelled) setItems(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Yüklenemedi");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>E-fatura taslakları</h1>
        <p>
          Gönderim öncesi taslaklar · path{" "}
          <code>{endpoints.invoices}</code>
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Taslak no</th>
              <th>Karşı taraf</th>
              <th>Belge ipucu</th>
              <th>Oluşturma</th>
              <th>Tutar</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const st = statusLabel(row.status);
              return (
                <tr key={row.id}>
                  <td>
                    <code>{row.draftNo}</code>
                  </td>
                  <td>{row.counterpartyTitle}</td>
                  <td>{row.documentHint ?? "—"}</td>
                  <td>{formatDateTime(row.createdAt)}</td>
                  <td>{formatTry(row.amount)}</td>
                  <td>
                    <span className={`badge tone-${st.tone}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
            {!items.length && !error ? (
              <tr>
                <td colSpan={6} className="cell-muted">
                  Yükleniyor…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
