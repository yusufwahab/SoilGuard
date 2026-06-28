import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Overview from "./pages/Overview";
import FieldDetail from "./pages/FieldDetail";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import Settings from "./pages/Settings";
import AIDashboard from "./pages/AIDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="fields" element={<Overview />} />
          <Route path="fields/:id" element={<FieldDetail />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="ai-dashboard" element={<AIDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
