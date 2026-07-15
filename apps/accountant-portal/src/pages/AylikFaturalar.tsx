import { useMemo, useState } from "react";
import { DurumBadge } from "../components/DurumBadge";
import {
  BelgeDurum,
  DONEM,
  FATURALAR,
  formatTRY,
  formatTarih,
} from "../data/mock";

export function AylikFaturalar() {
  const [durumFiltre, setDurumFiltre] = useState<BelgeDurum | "hepsi">("hepsi");
  const [mukellef, setMukellef] = useState("hepsi");

  const mukellefler = useMemo(
    () => Array.from(new Set(FATURALAR.map((f) => f.mukellef))),
    [],
  );

  const liste = FATURALAR.filter((f) => {
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
            {DONEM} dönemi mükellef faturaları. e-Fatura, e-Arşiv ve sektör alış-satış
            belgelerini durumu ve KDV ile görüntüleyin.
          </p>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="label">Liste sayısı</div>
          <div className="value">{liste.length}</div>
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
                  Filtreye uyan fatura yok.
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
