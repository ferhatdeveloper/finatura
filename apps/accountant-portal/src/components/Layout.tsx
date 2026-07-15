import { NavLink, Outlet } from "react-router-dom";

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Özet", end: true },
  { to: "/faturalar", label: "Aylık faturalar" },
  { to: "/gider-pusulasi", label: "Gider pusulası" },
  { to: "/banka-mutabakat", label: "Banka mutabakat" },
  { to: "/toplu-onay", label: "Toplu onay" },
];

export function Layout() {
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
          UI mock · API bağlantısı yok
          <br />
          Dönem: Temmuz 2026
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
