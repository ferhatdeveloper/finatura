import { useMemo, useState } from "react";
import {
  ONAY_BEKLEYENLER,
  OnayBekleyen,
  formatTRY,
  formatTarih,
} from "../data/mock";

export function TopluOnay() {
  const [kuyruk, setKuyruk] = useState<OnayBekleyen[]>(ONAY_BEKLEYENLER);
  const [secilen, setSecilen] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const seciliToplam = useMemo(
    () =>
      kuyruk
        .filter((o) => secilen.has(o.id))
        .reduce((s, o) => s + o.tutar, 0),
    [kuyruk, secilen],
  );

  const hepsiSecili = kuyruk.length > 0 && secilen.size === kuyruk.length;

  function toggle(id: string) {
    setSecilen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleHepsi() {
    if (hepsiSecili) setSecilen(new Set());
    else setSecilen(new Set(kuyruk.map((o) => o.id)));
  }

  function isle(aksiyon: "onay" | "red") {
    if (secilen.size === 0) return;
    const adet = secilen.size;
    setKuyruk((prev) => prev.filter((o) => !secilen.has(o.id)));
    setSecilen(new Set());
    setToast(
      aksiyon === "onay"
        ? `${adet} belge onaylandı (mock).`
        : `${adet} belge reddedildi (mock).`,
    );
    window.setTimeout(() => setToast(null), 2800);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Toplu onay</h1>
          <p>
            Faturaları, gider pusulalarını ve mutabakat kayıtlarını seçip toplu
            onaylayın veya reddedin. Bu ekran yalnızca arayüz mock’udur.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-danger"
            disabled={secilen.size === 0}
            onClick={() => isle("red")}
          >
            Reddet
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={secilen.size === 0}
            onClick={() => isle("onay")}
          >
            Seçilenleri onayla ({secilen.size})
          </button>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="label">Kuyruk</div>
          <div className="value">{kuyruk.length}</div>
        </div>
        <div className="stat">
          <div className="label">Seçili</div>
          <div className="value">{secilen.size}</div>
        </div>
        <div className="stat">
          <div className="label">Seçili tutar</div>
          <div className="value">{formatTRY(seciliToplam)}</div>
        </div>
      </div>

      <div className="panel">
        {kuyruk.length === 0 ? (
          <div className="empty-hint">Onay bekleyen belge kalmadı.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="check-col">
                  <input
                    type="checkbox"
                    checked={hepsiSecili}
                    onChange={toggleHepsi}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th>Tip</th>
                <th>Referans</th>
                <th>Mükellef</th>
                <th>Tarih</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {kuyruk.map((o) => (
                <tr key={o.id}>
                  <td className="check-col">
                    <input
                      type="checkbox"
                      checked={secilen.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`${o.referans} seç`}
                    />
                  </td>
                  <td>{o.tip}</td>
                  <td>{o.referans}</td>
                  <td>{o.mukellef}</td>
                  <td>{formatTarih(o.tarih)}</td>
                  <td className="num">{formatTRY(o.tutar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
