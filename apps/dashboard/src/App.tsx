import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { TaraPage } from "./pages/TaraPage";
import { CariPage } from "./pages/CariPage";
import { BankaMutabakatPage } from "./pages/BankaMutabakatPage";
import { EFaturaPage } from "./pages/EFaturaPage";
import { RaporlarPage } from "./pages/RaporlarPage";
import { SistemAyarlariPage } from "./pages/SistemAyarlariPage";
import { TenantYonetimiPage } from "./pages/TenantYonetimiPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="tara" element={<TaraPage />} />
        <Route path="cari" element={<CariPage />} />
        <Route path="banka-mutabakat" element={<BankaMutabakatPage />} />
        <Route path="e-fatura" element={<EFaturaPage />} />
        <Route path="raporlar" element={<RaporlarPage />} />
        <Route path="sistem" element={<SistemAyarlariPage />} />
        <Route path="yonetim" element={<TenantYonetimiPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
