import { useMemo } from "react";
import { Search } from "lucide-react";
import { inisial } from "../../../lib/inisial";
import type { Profile } from "../../../types/database";

function Avatar({ p, ukuran }: { p: Pick<Profile, "nama" | "foto_url">; ukuran: string }) {
  if (p.foto_url) return <img src={p.foto_url} alt="" className={`${ukuran} shrink-0 rounded-full object-cover`} />;
  return (
    <span className={`${ukuran} flex shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600`} aria-hidden="true">
      {inisial(p.nama)}
    </span>
  );
}

/** Cari & pilih satu pegawai aktif. Sesudah dipilih, tampil sebagai kartu dengan tombol Ganti. */
export default function PilihPegawai({
  daftar,
  terpilih,
  cari,
  onCari,
  onPilih,
}: {
  daftar: Profile[] | null;
  terpilih: Profile | null;
  cari: string;
  onCari: (v: string) => void;
  onPilih: (p: Profile | null) => void;
}) {
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const semua = daftar ?? [];
    return q ? semua.filter((p) => p.nama.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) : semua;
  }, [daftar, cari]);

  if (terpilih) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-lnd-sky p-3">
        <Avatar p={terpilih} ukuran="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-brand-text">{terpilih.nama}</p>
          <p className="break-all text-xs text-gray-500">{terpilih.email}</p>
        </div>
        <button
          type="button"
          onClick={() => onPilih(null)}
          className="min-h-[36px] shrink-0 rounded-full border border-gray-300 bg-white px-3 text-xs font-semibold text-brand-text transition active:scale-95"
        >
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-brand-masuk/30">
        <Search size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={cari}
          onChange={(e) => onCari(e.target.value)}
          placeholder="Cari nama atau email pegawai…"
          aria-label="Cari pegawai"
          className="min-h-[48px] w-full min-w-0 bg-transparent text-base outline-none"
        />
      </label>
      {!daftar ? (
        <div className="flex flex-col gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : tersaring.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">Tidak ada pegawai yang cocok.</p>
      ) : (
        <ul className="-mx-1 flex max-h-72 flex-col gap-1 overflow-y-auto px-1" aria-label="Daftar pegawai">
          {tersaring.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPilih(p)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-gray-50 active:scale-[0.98]"
              >
                <Avatar p={p} ukuran="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-brand-text">{p.nama}</span>
                  <span className="block truncate text-[11px] text-gray-500">{p.email}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
