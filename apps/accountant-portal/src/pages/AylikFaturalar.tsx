import { useEffect, useMemo, useState } from "react";
import { DurumBadge } from "../components/DurumBadge";
import { fetchFaturalar } from "../api/tenant";
import {
  BelgeDurum,
  currentPeriod,
  formatTRY,
  formatTarih,
  periodLabel,
  type FaturaKaydi,
} from "../data/types";

export function AylikFaturalar() {
  const period = currentPeriod();
  const [rows, setRows] = useState<FaturaKaydi[]>([]);
  const [durumFiltre, setDurumFiltre] = useState<BelgeDurum | "hepsi">("hepsi");
  const [mukellef, setMukellef] = useState("hepsi");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFaturalar(period);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Faturalar yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const mukellefler = useMemo(
    () => Array.from(new Set(rows.map((f) => f.mukellef))),
    [rows],
  );

  const liste = rows.filter((f) => {
    if (durumFiltre !== "hepsi" && f.durum !== durumFiltre) return false;
    if (mukellef !== "hepsi" && f.mukellef !== mukellef) return false;
    return true;
  });

  const toplam = liste.reduce((s, f) => s + f.tutar + f.kdv, 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Aylık fatura listesi</h1>
          <p>
            {periodLabel(period)} dönemi mükellef faturaları (canlı tenant API).
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
          <div className="label">Liste sayısı</div>
          <div className="value">{loading ? "…" : liste.length}</div>
        </div>
        <div className="stat">
          <div className="label">Toplam (KDV dahil)</div>
          <div className="value">{formatTRY(toplam)}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="fatura-durum">Durum</label>
          <select
            id="fatura-durum"
            value={durumFiltre}
            onChange={(e) => setDurumFiltre(e.target.value as BelgeDurum | "hepsi")}
          >
            <option value="hepsi">Tümü</option>
            <option value="taslak">Taslak</option>
            <option value="beklemede">Onay bekliyor</option>
            <option value="onaylandi">Onaylandı</option>
            <option value="reddedildi">Reddedildi</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fatura-mukellef">Mükellef</label>
          <select
            id="fatura-mukellef"
            value={mukellef}
            onChange={(e) => setMukellef(e.target.value)}
          >
            <option value="hepsi">Tüm mükellefler</option>
            {mukellefler.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Belge no</th>
              <th>Tarih</th>
              <th>Mükellef</th>
              <th>Sektör</th>
              <th>Tip</th>
              <th>Matrah</th>
              <th>KDV</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-hint">
                  {loading ? "Yükleniyor…" : "Filtreye uyan fatura yok."}
                </td>
              </tr>
            ) : (
              liste.map((f) => (
                <tr key={f.id}>
                  <td>{f.belgeNo}</td>
                  <td>{formatTarih(f.tarih)}</td>
                  <td>{f.mukellef}</td>
                  <td>{f.sektor}</td>
                  <td>{f.tip}</td>
                  <td className="num">{formatTRY(f.tutar)}</td>
                  <td className="num">{formatTRY(f.kdv)}</td>
                  <td>
                    <DurumBadge durum={f.durum} />
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
