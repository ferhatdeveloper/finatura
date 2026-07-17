import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { currentPeriod, periodLabel } from "../data/types";

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Özet", end: true },
  { to: "/faturalar", label: "Aylık faturalar" },
  { to: "/gider-pusulasi", label: "Gider pusulası" },
  { to: "/banka-mutabakat", label: "Banka mutabakat" },
  { to: "/toplu-onay", label: "Toplu onay" },
];

export function Layout() {
  const { user, session, logout } = useAuth();
  const navigate = useNavigate();
  const donem = periodLabel(currentPeriod());

  function onLogout() {
    logout();
    navigate("/giris", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-name">Finatura</p>
          <p className="brand-sub">Mali Müşavir Portalı</p>
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
        <div className="sidebar-foot">
          {session?.source === "mock" ? "Auth stub (mock)" : "Auth · API gateway"}
          <br />
          Dönem: {donem}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-firm">
            <p className="topbar-unvan">{user?.firmaUnvan ?? "—"}</p>
            <p className="topbar-meta">
              {user?.displayName}
              {user?.maliMusavirKodu || user?.firmaKodu
                ? ` · ${user.maliMusavirKodu || user.firmaKodu}`
                : null}
            </p>
          </div>
          <button type="button" className="btn btn-ghost topbar-logout" onClick={onLogout}>
            Çıkış
          </button>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
