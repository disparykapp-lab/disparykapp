import { useEffect, useState, type ReactNode } from "react";
import HeaderHalaman from "../components/HeaderHalaman";
import Loading from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";
import { formatTanggal } from "../lib/tanggal";
import { buatNaskahAi, ambilRiwayatNaskahAi, type FormNaskahAi } from "../lib/naskahAi";
import type { NaskahAi } from "../types/database";

const GAYA_OPSI = [
  { value: "berita", label: "Berita formal (TV/radio)" },
  { value: "siaran_pers", label: "Siaran pers resmi" },
  { value: "caption", label: "Caption media sosial" },
  { value: "voice_over", label: "Narasi voice-over video" },
];

const PANJANG_OPSI = [
  { value: "pendek", label: "Pendek (±100 kata)" },
  { value: "sedang", label: "Sedang (±200 kata)" },
  { value: "panjang", label: "Panjang (±400 kata)" },
];

const FORM_KOSONG: FormNaskahAi = {
  jenisAcara: "",
  namaAcara: "",
  lokasi: "",
  tanggal: "",
  narasumber: "",
  poinPenting: "",
  gaya: "berita",
  panjang: "sedang",
  platformTujuan: "",
};

export default function NaskahAi() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [form, setForm] = useState<FormNaskahAi>(FORM_KOSONG);
  const [membuat, setMembuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasilTerakhir, setHasilTerakhir] = useState<NaskahAi | null>(null);
  const [disalin, setDisalin] = useState(false);

  const [riwayat, setRiwayat] = useState<(NaskahAi & { profiles: { nama: string } | null })[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  async function muatRiwayat() {
    setLoadingRiwayat(true);
    try {
      setRiwayat(await ambilRiwayatNaskahAi());
    } catch {
      // riwayat gagal dimuat bukan hal fatal, form tetap bisa dipakai
    } finally {
      setLoadingRiwayat(false);
    }
  }

  useEffect(() => {
    void muatRiwayat();
  }, []);

  async function buat() {
    setError(null);
    setMembuat(true);
    try {
      const baris = await buatNaskahAi(form);
      setHasilTerakhir(baris);
      setDisalin(false);
      await muatRiwayat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat naskah.");
    } finally {
      setMembuat(false);
    }
  }

  async function salin() {
    if (!hasilTerakhir) return;
    try {
      await navigator.clipboard.writeText(hasilTerakhir.hasil);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    } catch {
      // clipboard API bisa ditolak browser/izin — abaikan, teks masih bisa diseleksi manual
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Naskah AI" kembaliKe="/beranda" />

      <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
        Isi kolom di bawah — AI akan merangkainya jadi naskah liputan. Jangan masukkan
        fakta/kutipan yang tidak kamu yakini benar, karena AI akan menulis persis berdasarkan
        apa yang kamu isi.
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm">
        <Field label="Jenis acara">
          <input
            value={form.jenisAcara}
            onChange={(e) => setForm((f) => ({ ...f, jenisAcara: e.target.value }))}
            placeholder="mis. Festival Budaya, Peresmian, Kunjungan Kerja"
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </Field>
        <Field label="Nama acara">
          <input
            value={form.namaAcara}
            onChange={(e) => setForm((f) => ({ ...f, namaAcara: e.target.value }))}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lokasi">
            <input
              value={form.lokasi}
              onChange={(e) => setForm((f) => ({ ...f, lokasi: e.target.value }))}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
          </Field>
          <Field label="Tanggal">
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
          </Field>
        </div>
        <Field label="Narasumber / pihak terlibat">
          <input
            value={form.narasumber}
            onChange={(e) => setForm((f) => ({ ...f, narasumber: e.target.value }))}
            placeholder="mis. Kepala Dinas Pariwisata, perwakilan UMKM"
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </Field>
        <Field label="Poin-poin penting / kronologi kegiatan *">
          <textarea
            value={form.poinPenting}
            onChange={(e) => setForm((f) => ({ ...f, poinPenting: e.target.value }))}
            rows={5}
            placeholder={"Tulis poin demi poin, mis.:\n- Acara dibuka jam 09.00 oleh...\n- Dihadiri sekitar 200 pengunjung\n- Ada pertunjukan tari tradisional..."}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gaya naskah">
            <select
              value={form.gaya}
              onChange={(e) => setForm((f) => ({ ...f, gaya: e.target.value }))}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            >
              {GAYA_OPSI.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Panjang naskah">
            <select
              value={form.panjang}
              onChange={(e) => setForm((f) => ({ ...f, panjang: e.target.value }))}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            >
              {PANJANG_OPSI.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Tujuan publikasi (opsional)">
          <input
            value={form.platformTujuan}
            onChange={(e) => setForm((f) => ({ ...f, platformTujuan: e.target.value }))}
            placeholder="mis. Instagram Dinas, website, press release media"
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={() => void buat()}
          disabled={membuat || form.poinPenting.trim().length < 5}
          className="min-h-[48px] rounded-xl bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
        >
          {membuat ? "Membuat naskah..." : "✨ Buat Naskah"}
        </button>
        <p className="text-center text-[11px] text-gray-400">Powered by RAFAEL AI</p>
      </div>

      {membuat && <LoadingAi />}

      {!membuat && hasilTerakhir && (
        <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-text">Hasil</p>
            <button onClick={() => void salin()} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-brand-text">
              {disalin ? "Tersalin ✓" : "Salin"}
            </button>
          </div>
          <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-brand-text">{hasilTerakhir.hasil}</p>
          <p className="text-right text-[11px] text-gray-400">✨ Powered by RAFAEL AI</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-brand-text">Riwayat{isAdmin ? " (semua pegawai)" : " Saya"}</p>
        {loadingRiwayat ? (
          <Loading teks="Memuat riwayat..." />
        ) : (
          <div className="flex flex-col gap-2">
            {riwayat.map((r) => (
              <details key={r.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <summary className="cursor-pointer">
                  <strong className="text-brand-text">{r.nama_acara || r.jenis_acara || "Naskah"}</strong>
                  {isAdmin && r.profiles?.nama && <span className="text-xs text-gray-400"> · oleh {r.profiles.nama}</span>}
                  <span className="block text-xs text-gray-400">{formatTanggal(r.created_at, "d MMM yyyy HH:mm")}</span>
                </summary>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-xs text-gray-700">{r.hasil}</p>
              </details>
            ))}
            {riwayat.length === 0 && (
              <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">Belum ada naskah dibuat.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-brand-text">{label}</span>
      {children}
    </label>
  );
}

const PESAN_AI = [
  "Membaca poin-poin kegiatan...",
  "Menyusun kronologi acara...",
  "Merangkai kalimat...",
  "Menghaluskan gaya bahasa...",
  "Menyelesaikan naskah...",
];

function LoadingAi() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PESAN_AI.length), 1700);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 text-center shadow-sm">
      <div className="kilau-ai h-2 w-full max-w-[220px] rounded-full" />
      <div className="flex items-center gap-2 text-sm font-medium text-brand-text">
        <span className="flex gap-1" aria-hidden="true">
          <span className="titik-ai h-2 w-2 rounded-full bg-purple-500" style={{ animationDelay: "0s" }} />
          <span className="titik-ai h-2 w-2 rounded-full bg-purple-500" style={{ animationDelay: "0.15s" }} />
          <span className="titik-ai h-2 w-2 rounded-full bg-purple-500" style={{ animationDelay: "0.3s" }} />
        </span>
        {PESAN_AI[i]}
      </div>
      <p className="text-[11px] text-gray-400">✨ Powered by RAFAEL AI</p>
    </div>
  );
}
