import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiConfig } from "../api/config";
import { AuthError, useAuth } from "../auth/AuthContext";
import { MOCK_ACCOUNTANT } from "../auth/loginApi";

export function Giris() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [maliMusavirKodu, setMaliMusavirKodu] = useState("");
  const [firmaKodu, setFirmaKodu] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!maliMusavirKodu.trim() && !firmaKodu.trim()) {
      setError("Mali müşavir kodu veya firma kodundan en az birini girin.");
      return;
    }

    setBusy(true);
    try {
      const session = await login({
        email,
        password,
        maliMusavirKodu: maliMusavirKodu.trim() || undefined,
        firmaKodu: firmaKodu.trim() || undefined,
      });

      if (session.user.role.toLowerCase() !== "accountant") {
        navigate("/yetkisiz", { replace: true });
        return;
      }

      navigate(from === "/giris" ? "/" : from, { replace: true });
    } catch (err) {
      const msg =
        err instanceof AuthError
          ? err.message
          : "Giriş yapılamadı. Bilgilerinizi kontrol edin.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Finatura</h1>
        <p className="login-sub">Mali müşavir girişi</p>
        <form className="login-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="maliMusavirKodu">Mali müşavir kodu</label>
            <input
              id="maliMusavirKodu"
              name="maliMusavirKodu"
              type="text"
              autoComplete="off"
              placeholder="örn. MM-DEMO"
              value={maliMusavirKodu}
              onChange={(ev) => setMaliMusavirKodu(ev.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="firmaKodu">Firma kodu</label>
            <input
              id="firmaKodu"
              name="firmaKodu"
              type="text"
              autoComplete="off"
              placeholder="örn. DEMO-GALERI"
              value={firmaKodu}
              onChange={(ev) => setFirmaKodu(ev.target.value)}
            />
          </div>

          <p className="login-hint">
            En az bir kod zorunlu. Gateway: {apiConfig.gatewayUrl}
            {apiConfig.authMode !== "gateway"
              ? ` · auth=${apiConfig.authMode}`
              : ""}
            {apiConfig.authMode === "mock"
              ? ` · Demo: ${MOCK_ACCOUNTANT.email} / ${MOCK_ACCOUNTANT.password}`
              : ""}
          </p>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
