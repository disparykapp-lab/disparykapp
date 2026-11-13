/** Keterangan wajib Dinas Luar + chip "pakai lagi" dari dinas luar sebelumnya. */
export default function IsianDinas({ nilai, onUbah, riwayat }: { nilai: string; onUbah: (v: string) => void; riwayat: string[] }) {
  const kurang = nilai.trim().length < 5;
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="catatan-dinas" className="text-sm font-bold text-brand-text">
          Tugas di mana?
        </label>
        <span className={`text-[11px] ${kurang ? "text-gray-400" : "font-semibold text-green-700"}`}>{kurang ? "wajib, min. 5 huruf" : "✓ siap"}</span>
      </div>
      <textarea
        id="catatan-dinas"
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        placeholder="Contoh: Survei lokasi wisata Kaliurang"
        rows={2}
        className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-base transition focus:border-brand-masuk focus:bg-white focus:outline-none"
      />
      {riwayat.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400">Pakai lagi:</span>
          {riwayat.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onUbah(r)}
              aria-pressed={nilai.trim() === r}
              className={`max-w-full truncate rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95 ${
                nilai.trim() === r ? "bg-brand-masuk text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
