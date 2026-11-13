import { useState } from "react";
import Lembar from "../../components/Lembar";
import SobekanTiket from "../../components/SobekanTiket";
import { useModal } from "../../lib/useModal";
import { formatJarak, type JenisAbsen, type ModeAbsen } from "../../lib/absenAturan";
import { formatDurasi } from "../../lib/statusHariIni";
import { CHIP_STATUS, JUDUL_ABSEN, NADA, TOMBOL_UTAMA, tanggalWIB } from "./gaya";

export interface HasilAbsen {
  waktu: number;
  jam: string;
  status: string;
  jarak: number;
  mode: ModeAbsen;
  fotoUrl: string;
  keterangan: string;
  ketGagal: boolean;
  /** lama bekerja (menit) — hanya absen pulang */
  kerjaMenit: number | null;
}

/** Bukti absen bergaya tiket boarding, foto bisa dibuka besar. */
export default function TiketBukti({
  jenis,
  nama,
  jadwal,
  hasil,
  onBeranda,
}: {
  jenis: JenisAbsen;
  nama: string;
  /** "08.00" — jadwal masuk, ditampilkan di bukti absen masuk */
  jadwal: string | null;
  hasil: HasilAbsen;
  onBeranda: () => void;
}) {
  const [lihatFoto, setLihatFoto] = useState(false);
  const chip = CHIP_STATUS[hasil.status] ?? { teks: hasil.status, nada: "abu" as const };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center text-center">
        <img src="/icon_checklist.png" alt="" className="animasi-checklist h-36 w-auto max-w-[60vw]" />
        <h2 className="mt-1 text-xl font-bold text-brand-text">{JUDUL_ABSEN[jenis]} berhasil</h2>
        <p className="text-sm text-gray-500">{jenis === "masuk" ? "Selamat bekerja, semangat hari ini!" : "Terima kasih untuk hari ini. Hati-hati di jalan!"}</p>
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm" aria-label={`Bukti ${JUDUL_ABSEN[jenis].toLowerCase()}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Bukti {JUDUL_ABSEN[jenis]}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${NADA[chip.nada]}`}>{chip.teks}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLihatFoto(true)}
            aria-label="Lihat foto absen"
            className="h-[72px] w-[54px] shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5 transition active:scale-95"
          >
            <img src={hasil.fotoUrl} alt="" className="h-full w-full object-cover" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-bold text-brand-text">{nama}</p>
            <p className="text-xs text-gray-500">{tanggalWIB(hasil.waktu)}</p>
          </div>
        </div>

        <SobekanTiket />

        <dl className="grid grid-cols-3 gap-2">
          <Kolom label="Jam" nilai={hasil.jam} besar />
          <Kolom label="Lokasi" nilai={hasil.mode === "luar" ? "Dinas Luar" : "Di Kantor"} sub={hasil.mode === "kantor" ? `${formatJarak(hasil.jarak)} dari kantor` : undefined} />
          {jenis === "pulang" && hasil.kerjaMenit !== null ? (
            <Kolom label="Total kerja" nilai={formatDurasi(hasil.kerjaMenit)} kanan />
          ) : jadwal ? (
            <Kolom label="Jadwal" nilai={jadwal} kanan />
          ) : null}
        </dl>

        {hasil.keterangan && (
          <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
            <span className="font-semibold text-brand-text">Keterangan:</span> “{hasil.keterangan}”
            {hasil.ketGagal && <span className="mt-1 block font-semibold text-amber-700">Keterangan gagal tersimpan — tambahkan lagi lewat menu Rekap.</span>}
          </p>
        )}
      </section>

      <button type="button" onClick={onBeranda} className={`${TOMBOL_UTAMA} min-h-[52px] flex-none`}>
        Kembali ke Beranda
      </button>

      {lihatFoto && <LembarFoto url={hasil.fotoUrl} onTutup={() => setLihatFoto(false)} />}
    </div>
  );
}

function Kolom({ label, nilai, sub, besar = false, kanan = false }: { label: string; nilai: string; sub?: string; besar?: boolean; kanan?: boolean }) {
  return (
    <div className={`min-w-0 ${kanan ? "text-right" : ""}`}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className={`font-bold leading-tight text-brand-text ${besar ? "text-2xl tabular-nums" : "mt-1 text-sm"}`}>{nilai}</dd>
      {sub && <dd className="text-[11px] text-gray-500">{sub}</dd>}
    </div>
  );
}

function LembarFoto({ url, onTutup }: { url: string; onTutup: () => void }) {
  useModal(onTutup);
  return (
    <Lembar idJudul="judul-foto-absen" judul="Foto absen" onTutup={onTutup} lebar="max-w-sm">
      <img src={url} alt="Foto absen" className="w-full rounded-xl" />
    </Lembar>
  );
}
