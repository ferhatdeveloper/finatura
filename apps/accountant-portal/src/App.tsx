import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnaSayfa } from "./pages/AnaSayfa";
import { AylikFaturalar } from "./pages/AylikFaturalar";
import { GiderPusulasi } from "./pages/GiderPusulasi";
import { BankaMutabakat } from "./pages/BankaMutabakat";
import { TopluOnay } from "./pages/TopluOnay";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AnaSayfa />} />
        <Route path="faturalar" element={<AylikFaturalar />} />
        <Route path="gider-pusulasi" element={<GiderPusulasi />} />
        <Route path="banka-mutabakat" element={<BankaMutabakat />} />
        <Route path="toplu-onay" element={<TopluOnay />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
