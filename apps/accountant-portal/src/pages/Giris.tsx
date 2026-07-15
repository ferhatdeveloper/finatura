import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthError, useAuth } from "../auth/AuthContext";
import { MOCK_ACCOUNTANT } from "../auth/loginApi";

export function Giris() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    "/";

  const [email, setEmail] = useState<string>(MOCK_ACCOUNTANT.email);
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
        <header className="login-brand">
          <p className="brand-name">Finatura</p>
          <p className="brand-sub">Mali Müşavir Portalı</p>
        </header>

        <h1>Giriş yapın</h1>
        <p className="login-lead">
          E-posta, şifre ve mali müşavir kodu veya firma kodu ile oturum açın.
        </p>

        <form className="login-form" onSubmit={onSubmit} noValidate>
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
              placeholder="örn. ORNEK-GALERI"
              value={firmaKodu}
              onChange={(ev) => setFirmaKodu(ev.target.value)}
            />
          </div>

          <p className="login-hint">
            En az bir kod zorunlu. Demo: {MOCK_ACCOUNTANT.email} /{" "}
            {MOCK_ACCOUNTANT.password} · kod {MOCK_ACCOUNTANT.maliMusavirKodu} veya{" "}
            {MOCK_ACCOUNTANT.firmaKodu}
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
