import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Oturum yoksa /giris; rol accountant değilse /yetkisiz */
export function RequireAccountant() {
  const { ready, isAuthenticated, isAccountant } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="auth-boot">
        <p>Oturum kontrol ediliyor…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/giris" replace state={{ from: location }} />;
  }

  if (!isAccountant) {
    return <Navigate to="/yetkisiz" replace />;
  }

  return <Outlet />;
}

/** Zaten giriş yapmış mali müşaviri panele yönlendir */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAccountant } = useAuth();
  if (isAuthenticated && isAccountant) {
    return <Navigate to="/" replace />;
  }
  if (isAuthenticated && !isAccountant) {
    return <Navigate to="/yetkisiz" replace />;
  }
  return <>{children}</>;
}
