import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchBankaHareketleri,
  fetchFaturalar,
  fetchGiderPusulalari,
  fetchOnayKuyrugu,
} from "../api/tenant";
import { currentPeriod, periodLabel } from "../data/types";

export function AnaSayfa() {
  const period = currentPeriod();
  const [bekleyenFatura, setBekleyenFatura] = useState(0);
  const [bekleyenPusula, setBekleyenPusula] = useState(0);
  const [eslesmeyen, setEslesmeyen] = useState(0);
  const [kuyruk, setKuyruk] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [faturalar, pusulalar, bankalar, onay] = await Promise.all([
          fetchFaturalar(period),
          fetchGiderPusulalari(period),
          fetchBankaHareketleri(),
          fetchOnayKuyrugu(period),
        ]);
        if (cancelled) return;
        setBekleyenFatura(
          faturalar.filter((f) => f.durum === "beklemede").length,
        );
        setBekleyenPusula(
          pusulalar.filter((g) => g.durum === "beklemede").length,
        );
        setEslesmeyen(bankalar.filter((b) => !b.mutabik).length);
        setKuyruk(onay.length);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Özet yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Mükellef defteri özeti</h1>
          <p>
            {periodLabel(period)} dönemi — faturalar, gider pusulaları ve banka
            hareketleri canlı API üzerinden.
          </p>
        </div>
      </header>

      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="muted">Yükleniyor…</p> : null}

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
          <div className="value">{kuyruk}</div>
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
          <p>Dönem seçimi, müşavir kodu ve Luca XML export.</p>
        </Link>
      </div>
    </>
  );
}
