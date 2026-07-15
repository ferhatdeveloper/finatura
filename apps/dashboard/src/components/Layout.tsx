import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiConfig } from "../api/config";

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Özet", end: true },
  { to: "/tara", label: "Tara" },
  { to: "/cari", label: "Cari / Veresiye" },
  { to: "/banka-mutabakat", label: "Banka mutabakat" },
  { to: "/e-fatura", label: "E-fatura taslakları" },
];

export function Layout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-mark">Finatura</p>
          <p className="brand-sub">Operasyon paneli</p>
        </div>

        <nav className="nav" aria-label="Ana menü">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-meta">
          <p className="meta-line">
            <span>Firma</span>
            <strong>{session?.firmaKodu ?? "—"}</strong>
          </p>
          <p className="meta-line">
            <span>Kullanıcı</span>
            <strong>{session?.user.displayName ?? session?.user.email}</strong>
          </p>
          <p className="meta-hint">
            {apiConfig.useMock ? "Mock API" : "Canlı API"} · gateway path hazır
          </p>
        </div>

        <button type="button" className="btn-logout" onClick={handleLogout}>
          Çıkış
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
