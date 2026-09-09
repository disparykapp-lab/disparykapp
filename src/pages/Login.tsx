import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { session, profile, loading, belumTerdaftar, loginGoogle } = useAuth();

  if (!loading && session && profile) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <img
          src="/logo-disparyk.png"
          alt="Logo Dinas Pariwisata Kota Yogyakarta"
          className="mx-auto mb-4 h-16 w-auto"
        />
        <h1 className="text-xl font-bold text-brand-text">DisparYK</h1>
        <p className="mt-1 text-sm text-gray-500">
          Absensi &amp; Kalender Konten Dinas Pariwisata Kota Yogyakarta
        </p>

        {belumTerdaftar && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            Akun kamu belum didaftarkan. Hubungi admin.
          </div>
        )}

        <button
          onClick={() => void loginGoogle()}
          disabled={loading}
          className="mt-6 flex w-full min-h-[52px] items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 text-base font-semibold text-brand-text shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
        >
          <GoogleIcon />
          Masuk dengan Google
        </button>

        <p className="mt-6 text-xs text-gray-400">
          Hanya email yang sudah didaftarkan admin yang bisa masuk.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.1 39.8 16 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.2 5.7l6.5 5.5C40.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
