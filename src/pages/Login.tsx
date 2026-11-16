import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import IkonGoogle from "../components/IkonGoogle";

export default function Login() {
  const { session, profile, loading, penolakan, sesiBerakhir, loginGoogle, daftarGoogle } = useAuth();
  const [membuka, setMembuka] = useState<"masuk" | "daftar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Dikirim RequireAuth saat halaman di dalam aplikasi butuh login (mis. sesi tadi berakhir).
  const dari = (useLocation().state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const kembali = dari?.pathname ? dari.pathname + (dari.search ?? "") : null;

  if (!loading && session && profile) {
    return <Navigate to={kembali ?? "/beranda"} replace />;
  }

  async function keGoogle(jenis: "masuk" | "daftar") {
    setMembuka(jenis);
    setError(null);
    try {
      if (jenis === "daftar") await daftarGoogle();
      // Setelah ditolak, tampilkan pemilih akun supaya tidak otomatis memakai email yang sama.
      else await loginGoogle({ pilihAkun: penolakan !== null, kembali });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Halaman Google gagal dibuka.");
      setMembuka(null);
    }
  }

  return (
    <div className="gradasi-brand flex min-h-screen flex-col items-center justify-center px-6 py-8">
      <div className="mb-6 flex flex-col items-center text-white">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 p-3 shadow-lg backdrop-blur">
          <img
            src="/logo-disparyk.png"
            alt="Logo Dinas Pariwisata Kota Yogyakarta"
            className="h-full w-auto object-contain"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold">DisparYK</h1>
        <p className="mt-1 max-w-xs text-center text-sm text-white/85">
          Presensi Dinas Pariwisata Kota Yogyakarta
        </p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl sm:p-8">
        {penolakan?.alasan === "belum_terdaftar" && (
          <div role="alert" className="mb-5 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200">
            <p className="text-sm font-bold text-amber-900">Email ini belum terdaftar</p>
            <p className="mt-0.5 break-all text-xs font-semibold text-amber-800">{penolakan.email}</p>
            <p className="mt-2 text-sm text-amber-900">
              Pegawai atau peserta magang baru? Daftar dulu pakai email ini. Akun aktif setelah
              disetujui admin.
            </p>
            <button
              type="button"
              onClick={() => void keGoogle("daftar")}
              disabled={membuka !== null}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-masuk px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {membuka === "daftar" ? "Membuka Google…" : "Daftar Akun Baru"}
            </button>
          </div>
        )}

        {penolakan?.alasan === "nonaktif" && (
          <div role="alert" className="mb-5 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200">
            <p className="text-sm font-bold text-amber-900">Akun belum aktif</p>
            <p className="mt-0.5 break-all text-xs font-semibold text-amber-800">{penolakan.email}</p>
            <p className="mt-2 text-sm text-amber-900">
              Kalau kamu baru mendaftar, tunggu admin menyetujui pendaftaranmu. Sudah lama
              menunggu? Hubungi admin.
            </p>
          </div>
        )}

        {sesiBerakhir && !penolakan && (
          <div role="status" className="mb-5 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200">
            <p className="text-sm font-bold text-amber-900">Sesi login berakhir</p>
            <p className="mt-1 text-sm text-amber-900">
              Biasanya karena akun ini keluar di perangkat lain atau lama tidak dibuka. Masuk lagi
              {kembali ? " — kamu akan kembali ke halaman tadi." : " untuk melanjutkan."}
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={() => void keGoogle("masuk")}
          disabled={loading || membuka !== null}
          className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 text-base font-semibold text-brand-text shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
        >
          <IkonGoogle />
          {membuka === "masuk" ? "Membuka Google…" : penolakan ? "Masuk dengan akun lain" : "Masuk dengan Google"}
        </button>

        {penolakan?.alasan !== "belum_terdaftar" && (
          <p className="mt-6 text-sm text-gray-500">
            Belum punya akun?{" "}
            <Link to="/daftar" className="font-semibold text-brand-masuk underline underline-offset-2">
              Daftar di sini
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
