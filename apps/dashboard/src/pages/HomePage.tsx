import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  fetchCariSummary,
  fetchEinvoiceDrafts,
  fetchSettlements,
} from "../api/tenant";
import { formatTry } from "../lib/format";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { session } = useAuth();
  const [cariOpen, setCariOpen] = useState<number | null>(null);
  const [settleOpen, setSettleOpen] = useState<number | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCariSummary(),
      fetchSettlements(),
      fetchEinvoiceDrafts(),
    ]).then(([cari, settlements, drafts]) => {
      if (cancelled) return;
      setCariOpen(cari.openVeresiyeCount);
      setSettleOpen(
        settlements.filter((s) => s.matchStatus === "unmatched").length,
      );
      setDraftCount(drafts.filter((d) => d.status !== "sent").length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Özet</h1>
        <p>
          Merhaba {session?.user.displayName ?? "kullanıcı"} — mobildeki ana
          işlerin web karşılığı.
        </p>
      </header>

      <div className="stat-grid">
        <Link to="/tara" className="stat-tile accent">
          <span className="stat-label">Belge tara</span>
          <strong>Yükle &amp; analiz et</strong>
          <span className="stat-foot">document-agent /analyze</span>
        </Link>
        <Link to="/cari" className="stat-tile">
          <span className="stat-label">Açık veresiye</span>
          <strong>{cariOpen ?? "…"}</strong>
          <span className="stat-foot">Cari özet</span>
        </Link>
        <Link to="/banka-mutabakat" className="stat-tile">
          <span className="stat-label">Mutabakat bekleyen</span>
          <strong>{settleOpen ?? "…"}</strong>
          <span className="stat-foot">Settlement listesi</span>
        </Link>
        <Link to="/e-fatura" className="stat-tile">
          <span className="stat-label">E-fatura taslak</span>
          <strong>{draftCount ?? "…"}</strong>
          <span className="stat-foot">Gönderime hazır / taslak</span>
        </Link>
      </div>

      <section className="panel">
        <h2>Hızlı erişim</h2>
        <p className="panel-lede">
          Günlük akış: belge tara → cari güncelle → banka eşleştir → e-fatura
          taslağını kontrol et.
        </p>
        <ul className="quick-list">
          <li>
            Açık borç toplamı için{" "}
            <Link to="/cari">Cari / Veresiye</Link> özetine bakın.
          </li>
          <li>
            Gelen havaleleri{" "}
            <Link to="/banka-mutabakat">Banka mutabakat</Link> ile kapatın.
          </li>
        </ul>
        {cariOpen !== null ? (
          <p className="muted-note">
            Mock özet yüklendi · örnek açık veresiye tutarı ~{" "}
            {formatTry(312500.5)}
          </p>
        ) : null}
      </section>
    </div>
  );
}
