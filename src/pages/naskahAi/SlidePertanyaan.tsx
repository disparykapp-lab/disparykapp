import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { buatPertanyaanWawancara, ambilRiwayatNaskahAi, type FormPertanyaanWawancara } from "../../lib/naskahAi";
import type { NaskahAi } from "../../types/database";
import { Field, LoadingAi, RiwayatList } from "./bersama";

const GAYA_OPSI = [
  { value: "formal", label: "Formal (pejabat/narasumber resmi)" },
  { value: "santai", label: "Santai (untuk media sosial)" },
];

const JUMLAH_OPSI = [3, 5, 8];

const FORM_KOSONG: FormPertanyaanWawancara = {
  jenisAcara: "",
  namaAcara: "",
  lokasi: "",
  tanggal: "",
  narasumber: "",
  poinPenting: "",
  gaya: "formal",
  jumlahPertanyaan: 5,
};

export default function SlidePertanyaan() {
  const { superAdmin } = useAuth();

  const [form, setForm] = useState<FormPertanyaanWawancara>(FORM_KOSONG);
  const [membuat, setMembuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasilTerakhir, setHasilTerakhir] = useState<NaskahAi | null>(null);
  const [disalin, setDisalin] = useState(false);

  const [riwayat, setRiwayat] = useState<(NaskahAi & { profiles: { nama: string } | null })[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [errorRiwayat, setErrorRiwayat] = useState<string | null>(null);

  async function muatRiwayat() {
    setLoadingRiwayat(true);
    setErrorRiwayat(null);
    try {
      setRiwayat(await ambilRiwayatNaskahAi("pertanyaan"));
    } catch (e) {
      setErrorRiwayat(e instanceof Error ? e.message : "Gagal memuat riwayat.");
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
      const baris = await buatPertanyaanWawancara(form);
      setHasilTerakhir(baris);
      setDisalin(false);
      await muatRiwayat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat pertanyaan.");
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
      <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
        Isi topik dan narasumbernya — AI akan menyusun daftar pertanyaan wawancara siap pakai
        saat liputan.
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
        <Field label="Narasumber yang diwawancara">
          <input
            value={form.narasumber}
            onChange={(e) => setForm((f) => ({ ...f, narasumber: e.target.value }))}
            placeholder="mis. Kepala Dinas Pariwisata Kota Yogyakarta"
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </Field>
        <Field label="Topik / poin yang ingin digali *">
          <textarea
            value={form.poinPenting}
            onChange={(e) => setForm((f) => ({ ...f, poinPenting: e.target.value }))}
            rows={5}
            placeholder={"Tulis poin demi poin, mis.:\n- Latar belakang acara ini diadakan\n- Target jumlah pengunjung\n- Rencana ke depan"}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gaya wawancara">
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
          <Field label="Jumlah pertanyaan">
            <select
              value={form.jumlahPertanyaan}
              onChange={(e) => setForm((f) => ({ ...f, jumlahPertanyaan: Number(e.target.value) }))}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            >
              {JUMLAH_OPSI.map((j) => (
                <option key={j} value={j}>
                  {j} pertanyaan
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={() => void buat()}
          disabled={membuat || form.poinPenting.trim().length < 5}
          className="min-h-[48px] rounded-xl bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
        >
          {membuat ? "Membuat pertanyaan..." : "🎤 Buat Pertanyaan"}
        </button>
        <p className="text-center text-[11px] text-gray-400">Powered by RAFAEL AI</p>
      </div>

      {membuat && <LoadingAi pesan="pertanyaan" />}

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

      <RiwayatList
        riwayat={riwayat}
        loading={loadingRiwayat}
        error={errorRiwayat}
        superAdmin={superAdmin}
        onHapus={() => void muatRiwayat()}
        kosongTeks="Belum ada pertanyaan dibuat."
      />
    </div>
  );
}
