import { useEffect, useState } from "react";
import { fetchSettlements } from "../api/tenant";
import type { SettlementItem } from "../api/mock";
import { formatDateTime, formatTry, statusLabel } from "../lib/format";
import { endpoints } from "../api/config";

export function BankaMutabakatPage() {
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettlements()
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
        <h1>Banka mutabakat</h1>
        <p>
          Settlement listesi · path <code>{endpoints.settlements}</code>
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Hesap</th>
              <th>Karşı taraf</th>
              <th>Açıklama</th>
              <th>Yön</th>
              <th>Tutar</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const st = statusLabel(row.matchStatus);
              return (
                <tr key={row.id}>
                  <td>{formatDateTime(row.transactionAt)}</td>
                  <td>{row.bankAccountAlias}</td>
                  <td>{row.counterpartyName ?? "—"}</td>
                  <td className="cell-muted">{row.description ?? "—"}</td>
                  <td>{row.direction === "inbound" ? "Gelen" : "Giden"}</td>
                  <td>{formatTry(row.amount)}</td>
                  <td>
                    <span className={`badge tone-${st.tone}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
            {!items.length && !error ? (
              <tr>
                <td colSpan={7} className="cell-muted">
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
