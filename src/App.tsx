import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RequireAdmin, RequireAuth } from "./components/Guard";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Beranda from "./pages/Beranda";
import Absen from "./pages/Absen";
import Rekap from "./pages/Rekap";
import Kalender from "./pages/Kalender";
import KontenForm from "./pages/KontenForm";
import Kelola from "./pages/admin/Kelola";
import Pegawai from "./pages/admin/Pegawai";
import Divisi from "./pages/admin/Divisi";
import Pengaturan from "./pages/admin/Pengaturan";
import TinjauAbsensi from "./pages/admin/TinjauAbsensi";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Beranda />} />
              <Route path="/absen/:jenis" element={<Absen />} />
              <Route path="/rekap" element={<Rekap />} />
              <Route path="/kalender" element={<Kalender />} />
              <Route path="/kalender/baru" element={<KontenForm />} />
              <Route path="/kalender/:id/edit" element={<KontenForm />} />

              <Route element={<RequireAdmin />}>
                <Route path="/kelola" element={<Kelola />} />
                <Route path="/kelola/pegawai" element={<Pegawai />} />
                <Route path="/kelola/divisi" element={<Divisi />} />
                <Route path="/kelola/pengaturan" element={<Pengaturan />} />
                <Route path="/kelola/tinjau" element={<TinjauAbsensi />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
