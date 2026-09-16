import { useState } from "react";
import { kirimKlarifikasiAbsensi } from "../lib/absensi";
import { keYMD } from "../lib/tanggal";

export default function FormKeteranganAbsen({ onTersimpan }: { onTersimpan?: () => void }) {
  const [terbuka, setTerbuka] = useState(false);
  const [tanggal, setTanggal] = useState(keYMD(new Date()));
  const [catatan, setCatatan] = useState("");
  const [bukti, setBukti] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  async function kirim() {
    if (catatan.trim().length < 3) {
      setError("Isi keterangan dulu (minimal 3 huruf).");
      return;
    }
    setMengirim(true);
    setError(null);
    try {
      await kirimKlarifikasiAbsensi(tanggal, catatan.trim(), bukti.trim());
      setTerbuka(false);
      setCatatan("");
      setBukti("");
      setSukses(true);
      onTersimpan?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim keterangan.");
    } finally {
      setMengirim(false);
    }
  }

  if (!terbuka) {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            setTerbuka(true);
            setSukses(false);
          }}
          className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text"
        >
          + Tambah Keterangan (mis. Sakit/Izin tidak masuk)
        </button>
        {sukses && (
          <p className="text-center text-xs text-brand-masuk">Keterangan berhasil disimpan.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm">
      <label className="text-xs font-medium text-gray-600">Tanggal</label>
      <input
        type="date"
        value={tanggal}
        max={keYMD(new Date())}
        onChange={(e) => setTanggal(e.target.value)}
        className="rounded-lg border border-gray-300 p-2 text-sm"
      />
      <label className="text-xs font-medium text-gray-600">Keterangan</label>
      <textarea
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        rows={2}
        placeholder="Contoh: Sakit demam, tidak bisa masuk kerja"
        className="rounded-lg border border-gray-300 p-2 text-sm"
      />
      <label className="text-xs font-medium text-gray-600">
        Link bukti (opsional — mis. link Google Drive)
      </label>
      <input
        value={bukti}
        onChange={(e) => setBukti(e.target.value)}
        className="rounded-lg border border-gray-300 p-2 text-sm"
        placeholder="https://drive.google.com/..."
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setTerbuka(false)}
          className="min-h-[40px] flex-1 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-brand-text"
        >
          Batal
        </button>
        <button
          onClick={() => void kirim()}
          disabled={mengirim}
          className="min-h-[40px] flex-1 rounded-lg bg-brand-masuk text-xs font-semibold text-white disabled:opacity-60"
        >
          {mengirim ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
