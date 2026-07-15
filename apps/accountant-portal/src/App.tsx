import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RedirectIfAuthed, RequireAccountant } from "./auth/RequireAccountant";
import { AnaSayfa } from "./pages/AnaSayfa";
import { AylikFaturalar } from "./pages/AylikFaturalar";
import { BankaMutabakat } from "./pages/BankaMutabakat";
import { GiderPusulasi } from "./pages/GiderPusulasi";
import { Giris } from "./pages/Giris";
import { TopluOnay } from "./pages/TopluOnay";
import { Yetkisiz } from "./pages/Yetkisiz";

export function App() {
  return (
    <Routes>
      <Route
        path="/giris"
        element={
          <RedirectIfAuthed>
            <Giris />
          </RedirectIfAuthed>
        }
      />
      <Route path="/yetkisiz" element={<Yetkisiz />} />

      <Route element={<RequireAccountant />}>
        <Route element={<Layout />}>
          <Route index element={<AnaSayfa />} />
          <Route path="faturalar" element={<AylikFaturalar />} />
          <Route path="gider-pusulasi" element={<GiderPusulasi />} />
          <Route path="banka-mutabakat" element={<BankaMutabakat />} />
          <Route path="toplu-onay" element={<TopluOnay />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
