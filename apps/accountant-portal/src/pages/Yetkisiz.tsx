import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Yetkisiz() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-brand">
          <p className="brand-name">Finatura</p>
          <p className="brand-sub">Mali Müşavir Portalı</p>
        </header>

        <h1>Erişim engellendi</h1>
        <p className="login-lead">
          Bu panel yalnızca <strong>accountant</strong> (mali müşavir) rolüne açıktır.
          {user ? (
            <>
              {" "}
              Oturum: {user.email} · rol: <code>{user.role}</code>
            </>
          ) : null}
        </p>

        <div className="login-actions">
          {isAuthenticated ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                logout();
              }}
            >
              Çıkış yap
            </button>
          ) : null}
          <Link className="btn btn-ghost" to="/giris">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
