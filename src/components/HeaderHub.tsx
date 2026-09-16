import { useAuth } from "../contexts/AuthContext";

export default function HeaderHub() {
  const { profile, logout } = useAuth();
  const inisial = profile?.nama?.trim()?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="gradasi-brand -mx-4 -mt-4 rounded-b-[2rem] px-5 pb-7 pt-5 text-white shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-disparyk.png" alt="Logo DisparYK" className="h-8 w-auto" />
          <span className="text-lg font-bold tracking-tight">DisparYK</span>
        </div>
        <button
          onClick={() => void logout()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-800"
          aria-label="Keluar"
          title="Keluar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
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
