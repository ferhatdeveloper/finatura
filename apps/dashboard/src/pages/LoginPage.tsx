import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MOCK_DEMO } from "../api/mock";
import { apiConfig } from "../api/config";
import { BrandLogo } from "../components/BrandLogo";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/";

  const [email, setEmail] = useState<string>(
    apiConfig.useMock ? MOCK_DEMO.email : "",
  );
  const [password, setPassword] = useState<string>(
    apiConfig.useMock ? MOCK_DEMO.password : "",
  );
  const [firmaKodu, setFirmaKodu] = useState<string>(
    apiConfig.useMock ? MOCK_DEMO.firmaKodu : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password, firmaKodu);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-atmosphere" aria-hidden />
      <section className="login-shell" aria-label="Finatura giriş">
        <aside className="login-brand-panel">
          <BrandLogo className="brand-logo--login-hero" />
          <p className="login-kicker">Esnaf mali operasyon merkezi</p>
          <h1>Belgeler, banka ve e-Fatura tek gece panelinde.</h1>
          <p className="login-copy">
            Galeri, kuyumcu ve emlak ekipleri için evrak akışını sakin,
            izlenebilir ve hızlı tutan operasyon ekranı.
          </p>
          <div className="login-proof" aria-label="Öne çıkan akışlar">
            <span>OCR</span>
            <span>Banka mutabakat</span>
            <span>e-Fatura</span>
          </div>
        </aside>

        <form className="login-panel" onSubmit={onSubmit}>
          <header className="login-header">
            <BrandLogo className="brand-logo--login-form" />
            <p className="login-eyebrow">Güvenli giriş</p>
            <h2>Operasyon paneli</h2>
            <p className="lede">
              Firma kodunuzla doğru çalışma alanına bağlanın.
            </p>
          </header>

          <label className="field">
            <span>E-posta</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Şifre</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Firma kodu</span>
            <input
              type="text"
              autoComplete="organization"
              required
              value={firmaKodu}
              onChange={(e) => setFirmaKodu(e.target.value)}
              placeholder="ör. ornek"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>

          <p className="login-hint">
            {apiConfig.useMock
              ? `Demo: ${MOCK_DEMO.email} / ${MOCK_DEMO.password} / ${MOCK_DEMO.firmaKodu}`
              : `API: ${apiConfig.gatewayUrl}/auth/login`}
          </p>
        </form>
      </section>
    </div>
  );
}
