import { useEffect, useState } from "react";
import { fetchCariSummary } from "../api/tenant";
import type { CariSummary } from "../api/mock";
import { formatTry } from "../lib/format";
import { endpoints } from "../api/config";

export function CariPage() {
  const [data, setData] = useState<CariSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCariSummary()
      .then((d) => {
        if (!cancelled) setData(d);
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
        <h1>Cari / Veresiye</h1>
        <p>
          Açık borç-alacak özeti · path{" "}
          <code>{endpoints.cariSummary}</code>
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {!data && !error ? <p className="muted-note">Yükleniyor…</p> : null}

      {data ? (
        <>
          <div className="stat-grid compact">
            <div className="stat-tile static">
              <span className="stat-label">Cari kart</span>
              <strong>{data.cariCount}</strong>
            </div>
            <div className="stat-tile static">
              <span className="stat-label">Açık veresiye</span>
              <strong>{data.openVeresiyeCount}</strong>
            </div>
            <div className="stat-tile static">
              <span className="stat-label">Açık borç (borçlu)</span>
              <strong>{formatTry(data.openDebitTry)}</strong>
            </div>
            <div className="stat-tile static">
              <span className="stat-label">Açık alacak</span>
              <strong>{formatTry(data.openCreditTry)}</strong>
            </div>
          </div>

          <section className="panel">
            <h2>Öne çıkan cariler</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unvan</th>
                  <th>Açık bakiye</th>
                </tr>
              </thead>
              <tbody>
                {data.topCaris.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{formatTry(c.openBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
