import { useEffect, useId, useState } from "react";
import { HeartPulse, X } from "lucide-react";
import { kirimKlarifikasiAbsensi } from "../lib/absensi";
import { keYMD } from "../lib/tanggal";
import InputBukti from "./InputBukti";

/**
 * Tombol bulat "Izin/Sakit" (di Beranda, di tengah antara Absen Masuk & Pulang)
 * yang membuka form keterangan tidak masuk: tanggal, alasan, dan foto bukti.
 * `className` mengatur posisinya di induk.
 */
export default function FormKeteranganAbsen({
  className = "",
  onTersimpan,
}: {
  className?: string;
  onTersimpan?: () => void;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
    if (!sukses) return;
    const t = window.setTimeout(() => setSukses(false), 3000);
    return () => window.clearTimeout(t);
  }, [sukses]);

  return (
    <>
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        aria-haspopup="dialog"
        className={`flex h-[62px] w-[62px] flex-col items-center justify-center gap-0.5 rounded-full border-2 border-brand-pulang/30 bg-white text-brand-pulang shadow-md ring-4 ring-brand-bg transition active:scale-95 ${className}`}
      >
        <HeartPulse size={22} strokeWidth={2.2} aria-hidden="true" />
        <span className="text-[9px] font-bold leading-none text-brand-text">Izin/Sakit</span>
      </button>

      {terbuka && (
        <ModalKeterangan
          onTutup={() => setTerbuka(false)}
          onTersimpan={() => {
            setTerbuka(false);
            setSukses(true);
            onTersimpan?.();
          }}
        />
      )}

      {sukses && (
        <p
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-text px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          ✓ Keterangan tersimpan
        </p>
      )}
    </>
  );
}

function ModalKeterangan({ onTutup, onTersimpan }: { onTutup: () => void; onTersimpan: () => void }) {
  const idJudul = useId();
  const [tanggal, setTanggal] = useState(keYMD(new Date()));
  const [catatan, setCatatan] = useState("");
  const [bukti, setBukti] = useState("");
  const [mengunggah, setMengunggah] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowLama;
      document.removeEventListener("keydown", onKey);
    };
  }, [onTutup]);

  async function kirim() {
    if (catatan.trim().length < 3) {
      setError("Isi keterangan dulu (minimal 3 huruf).");
      return;
    }
    setMengirim(true);
    setError(null);
    try {
      await kirimKlarifikasiAbsensi(tanggal, catatan.trim(), bukti);
      onTersimpan();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim keterangan.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id={idJudul} className="flex items-center gap-2 text-base font-bold text-brand-text">
            <HeartPulse size={20} className="text-brand-pulang" aria-hidden="true" /> Izin / Sakit
          </h2>
          <button type="button" onClick={onTutup} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <p className="-mt-1 text-xs text-gray-500">Kirim keterangan kalau kamu tidak masuk, beserta foto bukti (mis. surat dokter).</p>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Tanggal</span>
          <input
            type="date"
            value={tanggal}
            max={keYMD(new Date())}
            onChange={(e) => setTanggal(e.target.value)}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Keterangan</span>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={2}
            placeholder="Contoh: Sakit demam, tidak bisa masuk kerja"
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Foto bukti (opsional)</span>
          <InputBukti nilai={bukti} onUbah={setBukti} onSibuk={setMengunggah} />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onTutup}
            className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-brand-text"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void kirim()}
            disabled={mengirim || mengunggah}
            className="min-h-[44px] flex-1 rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
          >
            {mengirim ? "Menyimpan..." : mengunggah ? "Tunggu unggahan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
