import { Check, Loader2 } from "lucide-react";
import type { JenisAbsen } from "../../lib/absenAturan";
import { JUDUL_ABSEN, STIKER_ABSEN } from "./gaya";

/**
 * Layar mengirim: rute foto → tercatat, pesawat maju tiap tahap selesai
 * (sekali jalan per tahap, bukan animasi berulang).
 */
export default function LayarKirim({ jenis, tahapan, tahap, fotoUrl }: { jenis: JenisAbsen; tahapan: string[]; tahap: number; fotoUrl: string | null }) {
  const p = Math.min(1, tahap / tahapan.length);
  const sampai = p >= 1;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-live="polite" aria-busy={!sampai}>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Mengirim {JUDUL_ABSEN[jenis].toLowerCase()}</p>
      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span className="block h-14 w-14 overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-2 ring-white">
          {fotoUrl && <img src={fotoUrl} alt="" className="h-full w-full object-cover" />}
        </span>
        <div className="relative h-0.5">
          <div className="absolute inset-x-0 top-0 border-t-2 border-dashed border-gray-200" />
          <div className="absolute left-0 top-0 h-0.5 rounded-full bg-brand-masuk transition-[width] duration-700" style={{ width: `${p * 100}%` }} />
          <img
            src="/beranda/pesawat.png"
            alt=""
            aria-hidden="true"
            className="absolute top-0 h-7 w-9 -translate-x-1/2 -translate-y-1/2 -scale-x-100 object-contain transition-[left] duration-700 ease-out"
            style={{ left: `calc(18px + (100% - 36px) * ${p})` }}
          />
        </div>
        <img src={STIKER_ABSEN[jenis]} alt="" className={`h-14 w-14 object-contain transition duration-500 ${sampai ? "scale-110" : "opacity-50 grayscale"}`} />
      </div>
      <ol className="mt-5 space-y-2.5">
        {tahapan.map((t, i) => (
          <li key={t} className="flex items-center gap-2.5 text-sm">
            {i < tahap ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-masuk text-white">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
            ) : i === tahap ? (
              <Loader2 size={20} className="animate-spin text-brand-masuk" aria-hidden="true" />
            ) : (
              <span className="h-5 w-5 rounded-full border-2 border-gray-200" aria-hidden="true" />
            )}
            <span className={i < tahap ? "text-brand-text" : i === tahap ? "font-semibold text-brand-text" : "text-gray-400"}>{t}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
