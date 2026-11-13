const LANGKAH = ["Lokasi", "Foto", "Kirim"];

/** Pita 3 langkah di atas alur absen; `aktif` = 3 berarti semua selesai. */
export default function PitaLangkah({ aktif }: { aktif: number }) {
  return (
    <ol className="mb-4 grid grid-cols-3 gap-2" aria-label="Langkah absen">
      {LANGKAH.map((l, i) => (
        <li key={l} aria-current={i === aktif ? "step" : undefined}>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className={`h-full rounded-full bg-brand-masuk transition-[width] duration-500 ${i < aktif ? "w-full" : i === aktif ? "w-1/2" : "w-0"}`} />
          </div>
          <p className={`mt-1 text-[11px] font-semibold ${i <= aktif ? "text-brand-masuk" : "text-gray-400"}`}>
            {i + 1}. {l}
          </p>
        </li>
      ))}
    </ol>
  );
}
