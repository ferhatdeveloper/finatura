import { useEffect, useState } from "react";
import { fetchBankaHareketleri } from "../api/tenant";
import {
  currentPeriod,
  formatTRY,
  formatTarih,
  periodLabel,
  type BankaHareketi,
} from "../data/types";

export function BankaMutabakat() {
  const [hareketler, setHareketler] = useState<BankaHareketi[]>([]);
  const [sadeceAcik, setSadeceAcik] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setHareketler(await fetchBankaHareketleri());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Banka hareketleri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const liste = sadeceAcik ? hareketler.filter((h) => !h.mutabik) : hareketler;
  const mutabikSayisi = hareketler.filter((h) => h.mutabik).length;
  const acikSayisi = hareketler.length - mutabikSayisi;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Banka mutabakat</h1>
          <p>
            {periodLabel(currentPeriod())} banka hareketleri — gateway →
            tenant-router.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={loading}
          onClick={() => void load()}
        >
          Yenile
        </button>
      </header>

      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="stats">
        <div className="stat">
          <div className="label">Toplam hareket</div>
          <div className="value">{loading ? "…" : hareketler.length}</div>
        </div>
        <div className="stat">
          <div className="label">Mutabık</div>
          <div className="value">{mutabikSayisi}</div>
        </div>
        <div className="stat">
          <div className="label">Eşleşmeyen</div>
          <div className="value">{acikSayisi}</div>
        </div>
      </div>

      <div className="toolbar">
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={sadeceAcik}
            onChange={(e) => setSadeceAcik(e.target.checked)}
          />
          Yalnızca eşleşmeyenleri göster
        </label>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Banka</th>
              <th>Açıklama</th>
              <th>Yön</th>
              <th>Tutar</th>
              <th>Eşleşen belge</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-hint">
                  {loading ? "Yükleniyor…" : "Hareket yok."}
                </td>
              </tr>
            ) : (
              liste.map((h) => (
                <tr key={h.id}>
                  <td>{formatTarih(h.tarih)}</td>
                  <td>{h.banka}</td>
                  <td>{h.aciklama}</td>
                  <td>{h.yon === "giris" ? "Giriş" : "Çıkış"}</td>
                  <td className="num">{formatTRY(h.tutar)}</td>
                  <td>{h.eslesenBelge ?? "—"}</td>
                  <td>
                    {h.mutabik ? (
                      <span className="badge badge-ok">Mutabık</span>
                    ) : (
                      <span className="badge badge-warn">Açık</span>
                    )}
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
