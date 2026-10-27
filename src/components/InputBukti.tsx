import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { buktiDiStorage, hapusBuktiStorage, kompresFoto, unggahBukti, urlBukti } from "../lib/buktiIzin";

type Tahap = "diam" | "kompres" | "unggah" | "rampung";

/**
 * Unggah foto bukti keterangan (surat dokter, surat izin, dll.) ke bucket privat
 * bukti_izin: foto dikompres dulu di HP, lalu diunggah dengan lingkaran progres
 * 0–100%. `nilai` = isi kolom bukti_url ("storage:bukti_izin/…" atau link lama).
 */
export default function InputBukti({
  nilai,
  onUbah,
  onSibuk,
}: {
  nilai: string;
  onUbah: (nilai: string) => void;
  /** true selama kompres/unggah — tombol Simpan di form induk sebaiknya menunggu */
  onSibuk?: (sibuk: boolean) => void;
}) {
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tahap, setTahap] = useState<Tahap>("diam");
  const [persen, setPersen] = useState(0);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Foto yang diunggah di form ini (belum tentu disimpan) — boleh dihapus kalau diganti.
  const unggahanBaru = useRef(new Set<string>());
  // Hasil unggahan menunggu lingkaran progres penuh dulu sebelum ditampilkan.
  const hasilTertunda = useRef<string | null>(null);

  // Foto lama dari database: ambil signed URL untuk pratinjau.
  useEffect(() => {
    if (!buktiDiStorage(nilai) || unggahanBaru.current.has(nilai)) return;
    let batal = false;
    urlBukti(nilai)
      .then((url) => !batal && setPratinjau(url))
      .catch(() => !batal && setPratinjau(null));
    return () => {
      batal = true;
    };
  }, [nilai]);

  useEffect(() => {
    onSibuk?.(tahap !== "diam");
  }, [tahap, onSibuk]);

  async function pilihFoto(file: File | undefined) {
    if (!file || !profile) return;
    setError(null);
    setPersen(0);
    setTahap("kompres");
    try {
      const foto = await kompresFoto(file);
      setPratinjau(URL.createObjectURL(foto));
      setTahap("unggah");
      hasilTertunda.current = await unggahBukti(profile.id, foto, setPersen);
      setTahap("rampung");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah foto.");
      setPratinjau(null);
      setTahap("diam");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /** Dipanggil lingkaran progres saat angkanya sudah tampil 100%. */
  function selesaiUnggah() {
    const baru = hasilTertunda.current;
    if (tahap !== "rampung" || !baru) return;
    hasilTertunda.current = null;
    // Foto sebelumnya yang juga baru diunggah di form ini tidak terpakai lagi.
    if (unggahanBaru.current.has(nilai)) void hapusBuktiStorage(nilai);
    unggahanBaru.current.add(baru);
    onUbah(baru);
    setTahap("diam");
  }

  function hapus() {
    if (unggahanBaru.current.has(nilai)) void hapusBuktiStorage(nilai);
    setPratinjau(null);
    onUbah("");
  }

  const linkLama = !!nilai && !buktiDiStorage(nilai);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void pilihFoto(e.target.files?.[0])}
      />

      {tahap !== "diam" ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <LingkaranProgres target={tahap === "kompres" ? 0 : tahap === "rampung" ? 100 : persen} onPenuh={selesaiUnggah} />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {pratinjau && <img src={pratinjau} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
            <p className="text-sm text-gray-600">
              {tahap === "kompres" ? "Mengompres foto..." : tahap === "rampung" ? "Hampir selesai..." : "Mengunggah foto..."}
            </p>
          </div>
        </div>
      ) : nilai && !linkLama ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-2">
          {pratinjau ? (
            <img src={pratinjau} alt="Foto bukti" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white text-green-600">
              <ImageIcon size={22} />
            </span>
          )}
          <p className="min-w-0 flex-1 text-sm font-semibold text-green-700">✓ Foto bukti terunggah</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-text"
          >
            Ganti
          </button>
          <button
            type="button"
            onClick={hapus}
            aria-label="Hapus foto bukti"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <>
          {linkLama && (
            <p className="break-all rounded-lg bg-gray-50 p-2 text-xs text-gray-500">
              Link bukti sebelumnya: {nilai}
            </p>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white text-sm font-semibold text-gray-600"
          >
            <Camera size={18} /> {linkLama ? "Ganti dengan foto" : "Unggah foto bukti (opsional)"}
          </button>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Lingkaran progres 0–100%. Angka tampil mengejar persen asli dengan halus,
 * supaya foto kecil yang selesai dalam sekejap tetap terlihat naik dari 0.
 */
function LingkaranProgres({ target, onPenuh }: { target: number; onPenuh: () => void }) {
  const [tampil, setTampil] = useState(0);
  const penuh = useRef(onPenuh);
  useEffect(() => {
    penuh.current = onPenuh;
  });

  useEffect(() => {
    if (tampil >= 100) {
      // jeda sebentar di 100% supaya angkanya sempat terbaca
      const t = window.setTimeout(() => penuh.current(), 350);
      return () => window.clearTimeout(t);
    }
  }, [tampil]);

  useEffect(() => {
    let raf = 0;
    const langkah = () => {
      setTampil((t) => {
        if (t >= target) return t;
        return Math.min(target, t + Math.max(0.8, (target - t) * 0.08));
      });
      raf = requestAnimationFrame(langkah);
    };
    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const r = 22;
  const keliling = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className="stroke-gray-100" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - tampil / 100)}
          className="stroke-brand-masuk"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-brand-text">
        {Math.round(tampil)}%
      </span>
    </div>
  );
}
