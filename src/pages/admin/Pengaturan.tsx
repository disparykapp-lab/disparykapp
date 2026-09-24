import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import { ambilPosisi } from "../../lib/geolocation";
import type { Pengaturan as PengaturanType } from "../../types/database";

export default function Pengaturan() {
  const [form, setForm] = useState<PengaturanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengambilLokasi, setMengambilLokasi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
    supabase
      .from("pengaturan")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setForm(data as PengaturanType);
        setLoading(false);
      });
  }, []);

  async function ambilLokasiSaatIni() {
    setMengambilLokasi(true);
    setError(null);
    try {
      const p = await ambilPosisi();
      setForm((f) => (f ? { ...f, kantor_lat: p.lat, kantor_lng: p.lng } : f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil lokasi.");
    } finally {
      setMengambilLokasi(false);
    }
  }

  async function simpan() {
    if (!form) return;
    if (form.kantor_lat == null || form.kantor_lng == null) {
      setError("Titik lokasi kantor wajib diisi.");
      return;
    }
    setMenyimpan(true);
    setError(null);
    setSukses(false);
    const { error } = await supabase
      .from("pengaturan")
      .update({
        kantor_lat: form.kantor_lat,
        kantor_lng: form.kantor_lng,
        radius_meter: form.radius_meter,
        akurasi_maks_meter: form.akurasi_maks_meter,
        jam_masuk: form.jam_masuk,
        jam_pulang: form.jam_pulang,
        retensi_foto_hari: form.retensi_foto_hari,
        retensi_absensi_bulan: form.retensi_absensi_bulan,
      })
      .eq("id", 1);
    if (error) setError(error.message);
    else setSukses(true);
    setMenyimpan(false);
  }

  if (loading || !form) return <Loading teks="Memuat pengaturan..." />;

  const petaUrl =
    form.kantor_lat != null && form.kantor_lng != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${form.kantor_lng - 0.003}%2C${
          form.kantor_lat - 0.003
        }%2C${form.kantor_lng + 0.003}%2C${form.kantor_lat + 0.003}&layer=mapnik&marker=${
          form.kantor_lat
        }%2C${form.kantor_lng}`
      : null;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Pengaturan Kantor" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {sukses && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          Pengaturan berhasil disimpan.
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Titik Lokasi Kantor</p>
          {petaUrl && (
            <iframe
              title="Peta lokasi kantor"
              src={petaUrl}
              className="mb-2 h-48 w-full rounded-xl border border-gray-200"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              value={form.kantor_lat ?? ""}
              onChange={(e) => setForm({ ...form, kantor_lat: parseFloat(e.target.value) })}
              placeholder="Latitude"
              className="rounded-xl border border-gray-300 p-3 text-base"
            />
            <input
              type="number"
              step="any"
              value={form.kantor_lng ?? ""}
              onChange={(e) => setForm({ ...form, kantor_lng: parseFloat(e.target.value) })}
              placeholder="Longitude"
              className="rounded-xl border border-gray-300 p-3 text-base"
            />
          </div>
          <button
            onClick={() => void ambilLokasiSaatIni()}
            disabled={mengambilLokasi}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text disabled:opacity-60"
          >
            {mengambilLokasi ? "Mengambil lokasi..." : "📍 Ambil Lokasi Saat Ini"}
          </button>
        </div>

        <Field label="Radius Absen (meter)">
          <input
            type="number"
            value={form.radius_meter}
            onChange={(e) => setForm({ ...form, radius_meter: Number(e.target.value) })}
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </Field>

        <Field label="Akurasi GPS Maksimal (meter)">
          <input
            type="number"
            value={form.akurasi_maks_meter}
            onChange={(e) => setForm({ ...form, akurasi_maks_meter: Number(e.target.value) })}
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
          <p className="mt-1 text-xs text-gray-400">
            Lokasi dengan akurasi lebih buruk dari nilai ini akan ditolak sistem.
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Jam Masuk">
            <input
              type="time"
              step={1}
              value={form.jam_masuk.slice(0, 8)}
              onChange={(e) => setForm({ ...form, jam_masuk: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-base"
            />
          </Field>
          <Field label="Jam Pulang">
            <input
              type="time"
              step={1}
              value={form.jam_pulang.slice(0, 8)}
              onChange={(e) => setForm({ ...form, jam_pulang: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-base"
            />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          Batas jam masuk/pulang sekarang bisa diatur sampai ke detik (mis. 08:00:30).
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-brand-text">🗑️ Retensi Data Otomatis</p>
        <p className="-mt-2 text-xs text-gray-500">
          Data lama dihapus otomatis tiap hari lewat penjadwal database, supaya penyimpanan
          gratis tidak penuh. Pastikan ekspor rekap secara berkala sebelum data terhapus.
        </p>

        <Field label="Hapus foto absen setelah (hari)">
          <input
            type="number"
            min={1}
            value={form.retensi_foto_hari}
            onChange={(e) => setForm({ ...form, retensi_foto_hari: Number(e.target.value) })}
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </Field>

        <Field label="Hapus data absensi setelah (bulan)">
          <input
            type="number"
            min={1}
            value={form.retensi_absensi_bulan}
            onChange={(e) => setForm({ ...form, retensi_absensi_bulan: Number(e.target.value) })}
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
          <p className="mt-1 text-xs text-gray-400">
            Aplikasi menampilkan peringatan di menu Kelola mulai 7 hari sebelum data pertama
            kena hapus, supaya sempat diekspor dulu.
          </p>
        </Field>
      </div>

      <button
        onClick={() => void simpan()}
        disabled={menyimpan}
        className="min-h-[52px] rounded-xl bg-brand-masuk text-base font-semibold text-white disabled:opacity-60"
      >
        {menyimpan ? "Menyimpan..." : "Simpan Pengaturan"}
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
