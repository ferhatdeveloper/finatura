import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MOCK_DEMO } from "../api/mock";
import { apiConfig } from "../api/config";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/";

  const [identifier, setIdentifier] = useState<string>(
    apiConfig.useMock ? MOCK_DEMO.email : "",
  );
  const [password, setPassword] = useState<string>(
    apiConfig.useMock ? MOCK_DEMO.password : "",
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
      await login(identifier, password);
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
      <form className="login-panel" onSubmit={onSubmit}>
        <header className="login-header">
          <p className="brand-mark">Finatura</p>
          <h1>Operasyon paneli</h1>
          <p className="lede">
            E-posta, telefon, TC kimlik veya vergi no ile giriş yapın.
          </p>
        </header>

        <label className="field">
          <span>Kullanıcı adı</span>
          <input
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e-posta / telefon / TCKN / vergi no"
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

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>

        <p className="login-hint">
          {apiConfig.useMock
            ? `Demo: ${MOCK_DEMO.email} veya ${MOCK_DEMO.phone} / ${MOCK_DEMO.password}`
            : `API: ${apiConfig.gatewayUrl}/auth/login`}
        </p>
      </form>
    </div>
  );
}
