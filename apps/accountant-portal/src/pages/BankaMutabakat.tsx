import { useState } from "react";
import {
  BANKA_HAREKETLERI,
  BankaHareketi,
  DONEM,
  formatTRY,
  formatTarih,
} from "../data/mock";

export function BankaMutabakat() {
  const [hareketler, setHareketler] = useState<BankaHareketi[]>(BANKA_HAREKETLERI);
  const [sadeceAcik, setSadeceAcik] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const liste = sadeceAcik ? hareketler.filter((h) => !h.mutabik) : hareketler;
  const mutabikSayisi = hareketler.filter((h) => h.mutabik).length;
  const acikSayisi = hareketler.length - mutabikSayisi;

  function eslestir(id: string) {
    setHareketler((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              mutabik: true,
              eslesenBelge: h.eslesenBelge ?? "MANUEL-ESLESME",
            }
          : h,
      ),
    );
    setToast("Hareket eşleştirildi (mock — kaydedilmedi).");
    window.setTimeout(() => setToast(null), 2500);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Banka mutabakat</h1>
          <p>
            {DONEM} banka hareketlerini fatura / gider pusulası ile eşleştirin.
            Finteo entegrasyonu bağlandığında canlı veri gelecek.
          </p>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="label">Toplam hareket</div>
          <div className="value">{hareketler.length}</div>
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
              <th />
            </tr>
          </thead>
          <tbody>
            {liste.map((h) => (
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
                <td>
                  {!h.mutabik && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => eslestir(h.id)}
                    >
                      Eşleştir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
