import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Halaman yang dilebarkan di desktop. Sementara baru dashboard admin
// (Beranda & Kelola) — di HP tampilannya tetap sama persis.
const HALAMAN_LEBAR = ["/", "/kelola"];

export default function AppLayout() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const lebar = profile?.role === "admin" && HALAMAN_LEBAR.includes(pathname);

  return (
    <div className="min-h-screen bg-brand-bg">
      <main className={`mx-auto px-4 pb-8 pt-4 ${lebar ? "max-w-lg lg:max-w-5xl" : "max-w-lg"}`}>
        <Outlet />
      </main>
    </div>
  );
}
