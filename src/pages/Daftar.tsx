import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { daftarMandiri, unggahFotoProfil } from "../lib/profil";

interface OpsiDivisi {
  id: string;
  nama: string;
}

export default function Daftar() {
  const { session, profile, loading, belumTerdaftar, daftarGoogle, logout } = useAuth();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [daftarDivisi, setDaftarDivisi] = useState<OpsiDivisi[]>([]);
  const [nama, setNama] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [asalSekolah, setAsalSekolah] = useState("");
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [divisiId, setDivisiId] = useState("");
  const [fileFoto, setFileFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState(false);

  const userId = session?.user.id;
  const email = session?.user.email ?? "";

  useEffect(() => {
    if (!userId) return;
    const namaGoogle = session?.user.user_metadata?.full_name as string | undefined;
    setNama((n) => n || namaGoogle || "");
    void supabase
      .from("divisi")
      .select("id, nama")
      .eq("aktif", true)
      .order("nama")
      .then(({ data }) => setDaftarDivisi((data as OpsiDivisi[] | null) ?? []));
  }, [userId, session]);

  function pilihFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileFoto(file);
    setPreviewFoto(URL.createObjectURL(file));
  }

  async function kirim() {
    if (!userId || !fileFoto) {
      setError("Foto profil wajib diunggah.");
      return;
    }
    if (!nama.trim() || !tanggalLahir || !asalSekolah.trim() || !mulai || !selesai || !divisiId) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (selesai < mulai) {
      setError("Tanggal selesai magang tidak boleh sebelum tanggal mulai.");
      return;
    }
    setMengirim(true);
    setError(null);
    try {
      const fotoUrl = await unggahFotoProfil(userId, fileFoto);
      await daftarMandiri({
        nama: nama.trim(),
        tanggalLahir,
        asalSekolah: asalSekolah.trim(),
        tanggalMulaiMagang: mulai,
        tanggalSelesaiMagang: selesai,
        divisiId,
        fotoUrl,
      });
      setTerkirim(true);
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim pendaftaran.");
    } finally {
      setMengirim(false);
    }
  }

  if (terkirim) {
    return (
      <Kerangka>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">✅</div>
          <h2 className="text-lg font-bold text-brand-text">Pendaftaran terkirim</h2>
          <p className="text-sm text-gray-600">
            Data kamu sudah diterima. Akun akan aktif setelah disetujui admin — setelah itu kamu
            bisa masuk lewat halaman login.
          </p>
          <Link
            to="/login"
            className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-masuk text-base font-semibold text-white"
          >
            Ke Halaman Login
          </Link>
        </div>
      </Kerangka>
    );
  }

  if (!loading && session && profile) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <Kerangka>
        <p className="text-center text-sm text-gray-500">Memeriksa sesi...</p>
      </Kerangka>
    );
  }

  if (!session) {
    return (
      <Kerangka>
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-lg font-bold text-brand-text">Pendaftaran Akun</h2>
          <p className="text-sm text-gray-600">
            Masuk dengan akun Google yang akan kamu pakai untuk aplikasi ini, lalu lengkapi data
            diri.
          </p>
          {belumTerdaftar && (
            <div className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
              Email itu sudah terdaftar atau masih menunggu persetujuan admin. Tidak perlu
              mendaftar lagi — hubungi admin kalau belum bisa masuk.
            </div>
          )}
          <button
            onClick={() => void daftarGoogle()}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-base font-semibold text-brand-text shadow-sm transition hover:bg-gray-50"
          >
            Lanjut dengan Google
          </button>
        </div>
      </Kerangka>
    );
  }

  const inisial = nama.trim().charAt(0).toUpperCase() || "?";

  return (
    <Kerangka>
      <div className="flex flex-col gap-4">
        <h2 className="text-center text-lg font-bold text-brand-text">Lengkapi Data Diri</h2>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <Field label="Akun Google">
          <input
            value={email}
            disabled
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-base text-gray-500"
          />
          <button
            type="button"
            onClick={() => void logout()}
            className="self-start text-xs text-brand-masuk underline"
          >
            Bukan akun ini? Ganti akun
          </button>
        </Field>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-masuk text-3xl font-bold text-white shadow"
            aria-label="Pilih foto profil"
          >
            {previewFoto ? (
              <img src={previewFoto} alt="Foto profil" className="h-full w-full object-cover" />
            ) : (
              inisial
            )}
            <span className="absolute bottom-0 flex w-full items-center justify-center bg-black/50 py-1 text-[10px] text-white">
              {previewFoto ? "Ganti" : "Pilih"}
            </span>
          </button>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            onChange={pilihFoto}
            className="hidden"
          />
          <p className="text-xs text-gray-400">Foto profil (wajib)</p>
        </div>

        <Field label="Nama Lengkap">
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </Field>
        <Field label="Tanggal Lahir">
          <input
            type="date"
            value={tanggalLahir}
            onChange={(e) => setTanggalLahir(e.target.value)}
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </Field>
        <Field label="Asal Sekolah/Kampus">
          <input
            value={asalSekolah}
            onChange={(e) => setAsalSekolah(e.target.value)}
            placeholder="Contoh: SMK Negeri 1 Yogyakarta"
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Magang Dari">
            <input
              type="date"
              value={mulai}
              onChange={(e) => setMulai(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-base"
            />
          </Field>
          <Field label="Sampai">
            <input
              type="date"
              value={selesai}
              min={mulai || undefined}
              onChange={(e) => setSelesai(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-base"
            />
          </Field>
        </div>
        <Field label="Divisi">
          <select
            value={divisiId}
            onChange={(e) => setDivisiId(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base"
          >
            <option value="">- Pilih divisi -</option>
            {daftarDivisi.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama}
              </option>
            ))}
          </select>
        </Field>

        <button
          onClick={() => void kirim()}
          disabled={mengirim}
          className="min-h-[52px] rounded-xl bg-brand-masuk text-base font-semibold text-white disabled:opacity-60"
        >
          {mengirim ? "Mengirim..." : "Kirim Pendaftaran"}
        </button>
        <p className="text-center text-xs text-gray-400">
          Akun aktif setelah disetujui admin.
        </p>
      </div>
    </Kerangka>
  );
}

function Kerangka({ children }: { children: ReactNode }) {
  return (
    <div className="gradasi-brand flex min-h-screen flex-col items-center px-4 py-8">
      <div className="mb-5 flex flex-col items-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 p-2 shadow-lg backdrop-blur">
          <img
            src="/logo-disparyk.png"
            alt="Logo Dinas Pariwisata Kota Yogyakarta"
            className="h-full w-auto object-contain"
          />
        </div>
        <h1 className="mt-3 text-xl font-bold">DisparYK</h1>
      </div>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
