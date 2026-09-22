import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import KameraLive from "../components/KameraLive";
import HeaderHalaman from "../components/HeaderHalaman";
import { ambilPosisi, type Posisi } from "../lib/geolocation";
import {
  kirimKlarifikasiAbsensi,
  panggilAbsenMasuk,
  panggilAbsenPulang,
  tanggalHariIniWIB,
  unggahFotoAbsen,
} from "../lib/absensi";
import type { ModeAbsen } from "../types/database";

type Langkah = "mode" | "lokasi" | "kamera" | "mengirim" | "sukses" | "gagal";

const LABEL_JENIS: Record<"masuk" | "pulang", string> = {
  masuk: "Absen Masuk",
  pulang: "Absen Pulang",
};

/** Jeda minimum layar "mengirim" supaya animasi pesawat sempat terlihat,
 * meski request ke server sebenarnya sangat cepat. */
const ANIMASI_KIRIM_MIN_MS = 2600;

export default function Absen() {
  const { jenis } = useParams<{ jenis: "masuk" | "pulang" }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const jenisValid = jenis === "masuk" || jenis === "pulang";

  const [langkah, setLangkah] = useState<Langkah>("mode");
  const [mode, setMode] = useState<ModeAbsen>("kantor");
  const [catatan, setCatatan] = useState("");
  const [keteranganOpsional, setKeteranganOpsional] = useState("");
  const [buktiOpsional, setBuktiOpsional] = useState("");
  const [posisi, setPosisi] = useState<Posisi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ jam: string; status: string; jarak: number } | null>(null);

  useEffect(() => {
    if (langkah !== "sukses") return;
    const audio = new Audio("/iphone_sfx.mp3");
    audio.play().catch(() => {
      // Sebagian browser tetap memblokir autoplay meski dipicu dari interaksi
      // pengguna sebelumnya — abaikan saja, animasi tetap jalan tanpa suara.
    });
  }, [langkah]);

  const lanjutDariMode = useCallback(async () => {
    if (mode === "luar" && catatan.trim().length < 5) {
      setError("Isi keterangan dinas luar dulu (minimal 5 huruf).");
      return;
    }
    setError(null);
    setLangkah("lokasi");
    try {
      const p = await ambilPosisi();
      setPosisi(p);
      setLangkah("kamera");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil lokasi.");
      setLangkah("mode");
    }
  }, [mode, catatan]);

  const kirimAbsen = useCallback(
    async (blob: Blob) => {
      if (!profile || !posisi || !jenisValid) return;
      setLangkah("mengirim");
      setError(null);
      const mulaiKirim = Date.now();
      try {
        const fotoPath = await unggahFotoAbsen(profile.id, jenis === "masuk" ? "masuk" : "keluar", blob);
        const params = {
          lat: posisi.lat,
          lng: posisi.lng,
          akurasi: posisi.akurasi,
          mode,
          catatan: mode === "luar" ? catatan.trim() : null,
          fotoPath,
        };
        const respon =
          jenis === "masuk" ? await panggilAbsenMasuk(params) : await panggilAbsenPulang(params);

        if (keteranganOpsional.trim().length >= 3) {
          try {
            await kirimKlarifikasiAbsensi(
              tanggalHariIniWIB(),
              keteranganOpsional.trim(),
              buktiOpsional.trim()
            );
          } catch {
            // Absen sudah berhasil — keterangan opsional gagal tersimpan tidak menggagalkan absen.
          }
        }

        const sisaAnimasi = ANIMASI_KIRIM_MIN_MS - (Date.now() - mulaiKirim);
        if (sisaAnimasi > 0) {
          await new Promise((resolve) => setTimeout(resolve, sisaAnimasi));
        }

        setHasil({
          jam: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          status: respon.status,
          jarak: respon.jarak_m,
        });
        setLangkah("sukses");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Absen gagal. Coba lagi.");
        setLangkah("gagal");
      }
    },
    [profile, posisi, jenis, jenisValid, mode, catatan, keteranganOpsional, buktiOpsional]
  );

  if (!jenisValid) {
    return <p className="p-6 text-center text-red-600">Jenis absen tidak dikenal.</p>;
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <HeaderHalaman judul={LABEL_JENIS[jenis]} kembaliKe="/" />

      {langkah === "mode" && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-gray-600">Kamu sedang di mana sekarang?</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("kantor")}
              className={`min-h-[72px] rounded-2xl border-2 p-4 text-left font-semibold ${
                mode === "kantor"
                  ? "border-brand-masuk bg-brand-masuk/10 text-brand-masuk"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              🏢 Di Kantor
            </button>
            <button
              onClick={() => setMode("luar")}
              className={`min-h-[72px] rounded-2xl border-2 p-4 text-left font-semibold ${
                mode === "luar"
                  ? "border-brand-pulang bg-brand-pulang/10 text-brand-pulang"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              🚗 Dinas Luar
            </button>
          </div>

          {mode === "luar" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Keterangan dinas luar
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Survei lokasi wisata Kaliurang"
                rows={3}
                className="w-full rounded-xl border border-gray-300 p-3 text-base"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Keterangan (opsional)
            </label>
            <textarea
              value={keteranganOpsional}
              onChange={(e) => setKeteranganOpsional(e.target.value)}
              placeholder="Contoh: Telat karena macet parah di jalan"
              rows={2}
              className="w-full rounded-xl border border-gray-300 p-3 text-base"
            />
          </div>

          {keteranganOpsional.trim().length >= 3 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Link bukti (opsional)
              </label>
              <input
                value={buktiOpsional}
                onChange={(e) => setBuktiOpsional(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full rounded-xl border border-gray-300 p-3 text-base"
              />
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <button
            onClick={() => void lanjutDariMode()}
            className="min-h-[52px] rounded-xl bg-brand-masuk text-base font-semibold text-white"
          >
            Lanjutkan
          </button>
        </div>
      )}

      {langkah === "lokasi" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-masuk/30 border-t-brand-masuk" />
          <p className="text-gray-600">Sedang mengambil lokasi kamu...</p>
        </div>
      )}

      {langkah === "kamera" && posisi && profile && (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-center text-sm text-gray-600">
            Ambil foto wajah kamu sekarang (langsung dari kamera, bukan dari galeri)
          </p>
          <KameraLive
            nama={profile.nama}
            lat={posisi.lat}
            lng={posisi.lng}
            onFotoSiap={(blob) => void kirimAbsen(blob)}
            onBatal={() => setLangkah("mode")}
          />
        </div>
      )}

      {langkah === "mengirim" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden">
          <img
            src="/icon_pesawat.png"
            alt=""
            className="animasi-pesawat h-auto w-72 max-w-[80vw]"
          />
          <p className="text-gray-600">Mengirim data absen...</p>
        </div>
      )}

      {langkah === "sukses" && hasil && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <img
            src="/icon_checklist.png"
            alt="Berhasil"
            className="animasi-checklist h-auto w-96 max-w-[88vw]"
          />
          <h2 className="text-xl font-bold text-brand-text">
            {LABEL_JENIS[jenis]} berhasil pukul {hasil.jam}
          </h2>
          <p className="text-sm text-gray-500">
            Status: <StatusBadge status={hasil.status} />
          </p>
          {mode === "kantor" && (
            <p className="text-sm text-gray-500">Jarak dari kantor: {hasil.jarak} meter</p>
          )}
          <button
            onClick={() => navigate("/")}
            className="mt-2 min-h-[52px] w-full max-w-xs rounded-xl bg-brand-masuk text-base font-semibold text-white"
          >
            Kembali ke Beranda
          </button>
        </div>
      )}

      {langkah === "gagal" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-brand-text">Absen gagal</h2>
          <p className="max-w-xs text-sm text-gray-600">{error}</p>
          <div className="flex w-full max-w-xs gap-3">
            <button
              onClick={() => navigate("/")}
              className="min-h-[52px] flex-1 rounded-xl border border-gray-300 bg-white font-semibold text-brand-text"
            >
              Beranda
            </button>
            <button
              onClick={() => {
                setError(null);
                setLangkah("mode");
              }}
              className="min-h-[52px] flex-1 rounded-xl bg-brand-masuk font-semibold text-white"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    hadir: "Hadir",
    telat: "Telat",
    dinas_luar: "Dinas Luar",
  };
  return <span className="font-semibold text-brand-text">{label[status] ?? status}</span>;
}
