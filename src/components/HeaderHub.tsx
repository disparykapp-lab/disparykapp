import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function HeaderHub() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const inisial = profile?.nama?.trim()?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="gradasi-brand -mx-4 -mt-4 rounded-b-[2rem] px-5 pb-7 pt-5 text-white shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">📍</span>
          <span className="text-lg font-bold tracking-tight">DisparYK</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/panduan")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg"
            aria-label="Panduan"
          >
            ⚙️
          </button>
          <button
            onClick={() => void logout()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-base"
            aria-label="Keluar"
            title="Keluar"
          >
            🚪
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-1 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-brand-masuk shadow">
          {inisial}
        </div>
        <p className="mt-1 font-semibold">{profile?.nama}</p>
        <p className="text-xs text-white/80">Dinas Pariwisata Kota Yogyakarta</p>
        <span className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-masuk-dark">
          {profile?.role === "admin" ? "Admin" : "Pegawai"}
        </span>
      </div>
    </div>
  );
}
