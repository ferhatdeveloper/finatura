import { Link } from "react-router-dom";
import {
  BANKA_HAREKETLERI,
  DONEM,
  FATURALAR,
  GIDER_PUSULALARI,
  ONAY_BEKLEYENLER,
} from "../data/mock";

export function AnaSayfa() {
  const bekleyenFatura = FATURALAR.filter((f) => f.durum === "beklemede").length;
  const bekleyenPusula = GIDER_PUSULALARI.filter((g) => g.durum === "beklemede").length;
  const eslesmeyen = BANKA_HAREKETLERI.filter((b) => !b.mutabik).length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Mükellef defteri özeti</h1>
          <p>
            {DONEM} dönemi — faturalar, gider pusulaları ve banka hareketlerini tek
            ekrandan izleyin. Bu portal UI mock; gerçek API entegrasyonu sonraki aşamada.
          </p>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="label">Onay bekleyen fatura</div>
          <div className="value">{bekleyenFatura}</div>
        </div>
        <div className="stat">
          <div className="label">Onay bekleyen pusula</div>
          <div className="value">{bekleyenPusula}</div>
        </div>
        <div className="stat">
          <div className="label">Eşleşmeyen hareket</div>
          <div className="value">{eslesmeyen}</div>
        </div>
        <div className="stat">
          <div className="label">Toplu onay kuyruğu</div>
          <div className="value">{ONAY_BEKLEYENLER.length}</div>
        </div>
      </div>

      <div className="home-grid">
        <Link className="home-card" to="/faturalar">
          <h2>Aylık faturalar</h2>
          <p>e-Fatura / e-Arşiv ve alış-satış belgelerinin dönem listesi.</p>
        </Link>
        <Link className="home-card" to="/gider-pusulasi">
          <h2>Gider pusulası</h2>
          <p>Şahıs satıcı alımları, stopaj ve onay durumu.</p>
        </Link>
        <Link className="home-card" to="/banka-mutabakat">
          <h2>Banka mutabakat</h2>
          <p>Finteo hareketlerini fatura ve pusulalarla eşleştirme.</p>
        </Link>
        <Link className="home-card" to="/toplu-onay">
          <h2>Toplu onay</h2>
          <p>Seçili belgeleri tek tıkla onaylayın veya reddedin.</p>
        </Link>
      </div>
    </>
  );
}
