import { Flag } from "lucide-react";
import type { BarisAbsensi } from "../../../lib/rekap";
import type { Kategori, KartuTinjau } from "../../../lib/tinjauAbsenAturan";
import { inisial } from "../../../lib/inisial";
import { GAYA_KATEGORI, jam } from "./util";

/** Foto kecil kotak: foto absen, atau foto profil / inisial kalau tidak ada. */
export function FotoKecil({
  url,
  fotoProfil,
  nama,
  kategori,
  ukuran = "h-14 w-14",
}: {
  /** undefined = masih memuat, null = tidak ada foto absen */
  url: string | null | undefined;
  fotoProfil: string | null | undefined;
  nama: string;
  kategori: Kategori;
  ukuran?: string;
}) {
  if (url === undefined) return <span className={`${ukuran} shrink-0 animate-pulse rounded-xl bg-gray-100`} aria-hidden="true" />;
  if (url) return <img src={url} alt="" loading="lazy" decoding="async" className={`${ukuran} shrink-0 rounded-xl bg-gray-100 object-cover`} />;
  if (fotoProfil)
    return (
      <img
        src={fotoProfil}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${ukuran} shrink-0 rounded-xl bg-gray-100 object-cover ${kategori === "belum" ? "grayscale" : ""}`}
      />
    );
  const warna = kategori === "belum" ? "bg-gray-900 text-white" : kategori === "izin" ? "bg-red-50 text-red-600" : "bg-lnd-sky text-brand-masuk";
  return (
    <span className={`${ukuran} flex shrink-0 items-center justify-center rounded-xl text-base font-bold ${warna}`} aria-hidden="true">
      {inisial(nama)}
    </span>
  );
}

export function ChipStatus({ kategori, status }: { kategori: Kategori; status?: string }) {
  if (kategori === "hadir") {
    if (status !== "dinas_luar") return null;
    return <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Dinas Luar</span>;
  }
  const g = GAYA_KATEGORI[kategori];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.chip}`}>{g.label}</span>;
}

function ringkasJam(r: BarisAbsensi): string {
  if (r.status === "izin" && !r.masuk_at) return r.catatan_klarifikasi?.trim() || "Izin/Sakit";
  const masuk = r.masuk_at ? `Masuk ${jam(r.masuk_at)}` : "Belum masuk";
  const pulang = r.keluar_at ? `Pulang ${jam(r.keluar_at)}` : "belum pulang";
  return `${masuk} · ${pulang}`;
}

/** Kartu satu pegawai: foto kotak kecil + nama; diketuk = detail muncul ke depan. */
export default function KartuAbsen({
  kartu,
  fotoUrl,
  fotoProfil,
  namaDivisi,
  onBuka,
}: {
  kartu: KartuTinjau<BarisAbsensi>;
  fotoUrl: Record<string, string | null>;
  fotoProfil: string | null | undefined;
  namaDivisi: string | null;
  onBuka: () => void;
}) {
  const r = kartu.row;
  const path = r?.masuk_foto_path ?? r?.keluar_foto_path ?? null;
  const url = path ? fotoUrl[path] : null;
  const isi = (
    <>
      <FotoKecil url={url} fotoProfil={fotoProfil} nama={kartu.nama} kategori={kartu.kategori} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 font-semibold text-brand-text">
          <span className="truncate">{kartu.nama}</span>
          {r?.ditandai && <Flag size={14} className="shrink-0 fill-red-500 text-red-500" aria-label="Ditandai" />}
        </p>
        <p className="truncate text-xs text-gray-500">{r ? ringkasJam(r) : "Belum absen masuk"}</p>
        {namaDivisi && <p className="truncate text-[11px] text-gray-400">{namaDivisi}</p>}
      </div>
      <ChipStatus kategori={kartu.kategori} status={r?.status} />
    </>
  );
  const kelas = `flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white p-2.5 pr-3 text-left ${GAYA_KATEGORI[kartu.kategori].kartu}`;

  if (!r) return <div className={kelas}>{isi}</div>;
  return (
    <button type="button" onClick={onBuka} aria-haspopup="dialog" className={`${kelas} transition active:scale-[0.98]`}>
      {isi}
    </button>
  );
}
