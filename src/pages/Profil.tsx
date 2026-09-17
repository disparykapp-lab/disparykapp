import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import HeaderHalaman from "../components/HeaderHalaman";
import { useAuth } from "../contexts/AuthContext";
import { simpanProfilSaya, unggahFotoProfil, hitungProgressMagang } from "../lib/profil";
import { formatTanggal } from "../lib/tanggal";

export default function Profil() {
  const { profile, divisi, refreshProfile } = useAuth();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [nama, setNama] = useState(profile?.nama ?? "");
  const [tanggalLahir, setTanggalLahir] = useState(profile?.tanggal_lahir ?? "");
  const [asalSekolah, setAsalSekolah] = useState(profile?.asal_sekolah ?? "");
  const [previewFoto, setPreviewFoto] = useState<string | null>(profile?.foto_url ?? null);
  const [fileBaru, setFileBaru] = useState<File | null>(null);

  const [mengunggah, setMengunggah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  function pilihFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileBaru(file);
    setPreviewFoto(URL.createObjectURL(file));
  }

  async function simpan() {
    if (!profile) return;
    if (!nama.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setMenyimpan(true);
    setMengunggah(!!fileBaru);
    setError(null);
    setSukses(false);
    try {
      let fotoUrl = profile.foto_url;
      if (fileBaru) {
        fotoUrl = await unggahFotoProfil(profile.id, fileBaru);
      }
      await simpanProfilSaya(profile.id, {
        nama: nama.trim(),
        foto_url: fotoUrl,
        tanggal_lahir: tanggalLahir || null,
        asal_sekolah: asalSekolah.trim() || null,
      });
      await refreshProfile();
      setFileBaru(null);
      setSukses(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan profil.");
    } finally {
      setMenyimpan(false);
      setMengunggah(false);
    }
  }

  const magang =
    profile?.tanggal_mulai_magang && profile?.tanggal_selesai_magang
      ? hitungProgressMagang(profile.tanggal_mulai_magang, profile.tanggal_selesai_magang)
      : null;

  const inisial = nama.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Profil Saya" kembaliKe="/" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {sukses && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          Profil berhasil disimpan.
        </div>
      )}

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm">
        <button
          onClick={() => inputFotoRef.current?.click()}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-masuk text-3xl font-bold text-white shadow"
          aria-label="Ganti foto profil"
        >
          {previewFoto ? (
            <img src={previewFoto} alt="Foto profil" className="h-full w-full object-cover" />
          ) : (
            inisial
          )}
          <span className="absolute bottom-0 flex w-full items-center justify-center bg-black/50 py-1 text-[10px] text-white">
            Ganti
          </span>
        </button>
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          onChange={pilihFoto}
          className="hidden"
        />
        <p className="text-xs text-gray-400">Tekan foto untuk mengganti</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <Field label="Nama">
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </Field>
        <Field label="Email">
          <input
            value={profile?.email ?? ""}
            disabled
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-base text-gray-500"
          />
        </Field>
        <Field label="Divisi">
          <input
            value={divisi?.nama ?? "- Belum ditentukan -"}
            disabled
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-base text-gray-500"
          />
        </Field>
        <Field label="Tanggal Lahir">
          <input
            type="date"
            value={tanggalLahir ?? ""}
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
      </div>

      {profile?.tanggal_mulai_magang && profile?.tanggal_selesai_magang && (
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand-text">Masa Magang</p>
          <p className="text-xs text-gray-500">
            {formatTanggal(profile.tanggal_mulai_magang)} – {formatTanggal(profile.tanggal_selesai_magang)}
          </p>
          {magang && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-masuk"
                  style={{ width: `${magang.persen}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {magang.persen}% berjalan · {magang.teksSisa}
              </p>
            </>
          )}
          <p className="text-[11px] text-gray-400">
            Tanggal masa magang diatur oleh admin lewat Kelola &gt; Pegawai.
          </p>
        </div>
      )}

      <button
        onClick={() => void simpan()}
        disabled={menyimpan}
        className="min-h-[52px] rounded-xl bg-brand-masuk text-base font-semibold text-white disabled:opacity-60"
      >
        {mengunggah ? "Mengunggah foto..." : menyimpan ? "Menyimpan..." : "Simpan Profil"}
      </button>
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
