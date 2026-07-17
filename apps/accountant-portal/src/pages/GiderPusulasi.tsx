import { useEffect, useState } from "react";
import { DurumBadge } from "../components/DurumBadge";
import { fetchGiderPusulalari } from "../api/tenant";
import {
  BelgeDurum,
  currentPeriod,
  formatTRY,
  formatTarih,
  periodLabel,
  type GiderPusulasi as GiderPusulasiRow,
} from "../data/types";

export function GiderPusulasi() {
  const period = currentPeriod();
  const [rows, setRows] = useState<GiderPusulasiRow[]>([]);
  const [durumFiltre, setDurumFiltre] = useState<BelgeDurum | "hepsi">("hepsi");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGiderPusulalari(period);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Pusulalar yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const liste = rows.filter(
    (g) => durumFiltre === "hepsi" || g.durum === durumFiltre,
  );

  const toplamMatrah = liste.reduce((s, g) => s + g.tutar, 0);
  const toplamStopaj = liste.reduce((s, g) => s + g.stopaj, 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Gider pusulası</h1>
          <p>
            {periodLabel(period)} — vergi mükellefi olmayanlardan alış kayıtları
            (canlı tenant API).
          </p>
        </div>
      </header>

      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="stats">
        <div className="stat">
          <div className="label">Pusula adedi</div>
          <div className="value">{loading ? "…" : liste.length}</div>
        </div>
        <div className="stat">
          <div className="label">Toplam tutar</div>
          <div className="value">{formatTRY(toplamMatrah)}</div>
        </div>
        <div className="stat">
          <div className="label">Toplam stopaj</div>
          <div className="value">{formatTRY(toplamStopaj)}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="gp-durum">Durum</label>
          <select
            id="gp-durum"
            value={durumFiltre}
            onChange={(e) => setDurumFiltre(e.target.value as BelgeDurum | "hepsi")}
          >
            <option value="hepsi">Tümü</option>
            <option value="taslak">Taslak</option>
            <option value="beklemede">Onay bekliyor</option>
            <option value="onaylandi">Onaylandı</option>
          </select>
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Pusula no</th>
              <th>Tarih</th>
              <th>Mükellef</th>
              <th>Açıklama</th>
              <th>Tutar</th>
              <th>Stopaj</th>
              <th>Net ödeme</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-hint">
                  {loading ? "Yükleniyor…" : "Kayıt yok."}
                </td>
              </tr>
            ) : (
              liste.map((g) => (
                <tr key={g.id}>
                  <td>{g.pusulaNo}</td>
                  <td>{formatTarih(g.tarih)}</td>
                  <td>{g.mukellef}</td>
                  <td>{g.aciklama}</td>
                  <td className="num">{formatTRY(g.tutar)}</td>
                  <td className="num">{formatTRY(g.stopaj)}</td>
                  <td className="num">{formatTRY(g.tutar - g.stopaj)}</td>
                  <td>
                    <DurumBadge durum={g.durum} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
