import { hitungProgressMagang } from "../../../lib/profil";
import { inisial } from "../../../lib/inisial";
import { punyaMasaMagang } from "../../../lib/pegawaiAturan";
import type { Profile } from "../../../types/database";

/** Foto profil kotak (atau inisial), dengan titik hijau kalau online. */
export function AvatarPegawai({ p, online, ukuran = "h-14 w-14", teks = "text-base" }: { p: Profile; online: boolean; ukuran?: string; teks?: string }) {
  return (
    <span className={`relative ${ukuran} shrink-0`}>
      {p.foto_url ? (
        <img src={p.foto_url} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${ukuran} rounded-xl bg-gray-100 object-cover`} />
      ) : (
        <span className={`${ukuran} flex items-center justify-center rounded-xl bg-lnd-sky font-bold text-brand-masuk ${teks}`} aria-hidden="true">
          {inisial(p.nama)}
        </span>
      )}
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" aria-label="Online" />}
    </span>
  );
}

export function BilahMagang({ p, lebar = "w-16" }: { p: Profile; lebar?: string }) {
  if (!punyaMasaMagang(p)) return null;
  const m = hitungProgressMagang(p.tanggal_mulai_magang!, p.tanggal_selesai_magang!);
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-gray-500">
      <span className={`h-1.5 ${lebar} shrink-0 overflow-hidden rounded-full bg-gray-100`}>
        <span className="block h-full rounded-full bg-brand-masuk" style={{ width: `${m.persen}%` }} />
      </span>
      {m.selesai ? "magang selesai" : `magang ${m.persen}%`}
    </span>
  );
}

/** Kartu satu pegawai: bersih di luar, diketuk = detail muncul ke depan. */
export default function KartuPegawai({
  p,
  online,
  namaDivisi,
  onBuka,
}: {
  p: Profile;
  online: boolean;
  namaDivisi: string | null;
  onBuka: () => void;
}) {
  const sub = [p.jabatan, namaDivisi].filter(Boolean).join(" · ") || p.email;
  return (
    <button
      type="button"
      onClick={onBuka}
      aria-haspopup="dialog"
      className={`flex w-full min-w-0 items-center gap-3 rounded-2xl p-2.5 pr-3 text-left transition active:scale-[0.98] ${
        p.aktif ? "bg-white shadow-sm ring-1 ring-black/5" : "border-2 border-dashed border-gray-300 bg-white/60 opacity-70"
      }`}
    >
      <span className={p.aktif ? "" : "grayscale"}>
        <AvatarPegawai p={p} online={online} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-semibold text-brand-text">{p.nama}</span>
        <span className="truncate text-xs text-gray-500">{sub}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <BilahMagang p={p} />
          {p.wajib_absen === false && <span className="text-[11px] text-gray-400">Tidak wajib absen</span>}
        </span>
      </span>
      {!p.aktif ? (
        <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">Nonaktif</span>
      ) : (
        p.role === "admin" && <span className="shrink-0 rounded-full bg-brand-masuk/10 px-2 py-0.5 text-[11px] font-semibold text-brand-masuk">Admin</span>
      )}
    </button>
  );
}
