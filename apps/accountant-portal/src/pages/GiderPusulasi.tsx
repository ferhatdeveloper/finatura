import { useState } from "react";
import { DurumBadge } from "../components/DurumBadge";
import {
  BelgeDurum,
  DONEM,
  GIDER_PUSULALARI,
  formatTRY,
  formatTarih,
} from "../data/mock";

export function GiderPusulasi() {
  const [durumFiltre, setDurumFiltre] = useState<BelgeDurum | "hepsi">("hepsi");

  const liste = GIDER_PUSULALARI.filter(
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
            {DONEM} — vergi mükellefi olmayanlardan alış (noter, hurda altın, şahıs
            araç vb.). Stopaj hesapları mock veriyle gösterilir.
          </p>
        </div>
        <button type="button" className="btn btn-primary" disabled title="Mock">
          Yeni pusula (yakında)
        </button>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="label">Pusula adedi</div>
          <div className="value">{liste.length}</div>
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
            {liste.map((g) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
