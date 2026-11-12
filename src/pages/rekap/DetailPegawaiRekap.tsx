import { useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, MessageSquareText } from "lucide-react";
import Lembar from "../../components/Lembar";
import { useModal } from "../../lib/useModal";
import { unduhExcelRekap } from "../../lib/excel";
import { bukaBukti, buktiDiStorage } from "../../lib/buktiIzin";
import { tingkatKerajinan } from "../../lib/peringkat";
import { teksDenganLink } from "../../lib/linkify";
import { formatDurasi } from "../../lib/statusHariIni";
import { KOTAK_REKAP, geserBulanYm, susunBulan, type HariRekap, type JenisRekap } from "../../lib/rekapSayaAturan";
import { ringkasanExcel, type EntriTim } from "../../lib/rekapTimAturan";
import type { BarisAbsensi } from "../../lib/rekap";
import type { Profile } from "../../types/database";
import { AvatarPegawai } from "../admin/pegawai/KartuPegawai";
import KalenderRekap from "./KalenderRekap";
import { GAYA_HARI, jamWIB } from "./gaya";

const fmtPanjang = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const WARNA_ANGKA: Record<JenisRekap, string> = {
  hadir: "bg-green-50 text-green-800",
  telat: "bg-amber-50 text-amber-900",
  dinas: "bg-sky-50 text-sky-800",
  izin: "bg-red-50 text-red-700",
  tidak: "bg-gray-900 text-white",
};

/** Detail rekap satu pegawai untuk admin: skor, kalender berwarna periode itu, dan info per hari. */
export default function DetailPegawaiRekap({
  e,
  dari,
  sampai,
  hariIni,
  labelPeriode,
  namaDivisi,
  rows,
  posisi,
  total,
  onSebelum,
  onBerikut,
  onTutup,
}: {
  e: EntriTim<Profile, BarisAbsensi>;
  dari: string;
  sampai: string;
  hariIni: string;
  labelPeriode: string;
  namaDivisi: string | null;
  rows: BarisAbsensi[];
  posisi: number;
  total: number;
  onSebelum: (() => void) | null;
  onBerikut: (() => void) | null;
  onTutup: () => void;
}) {
  const idJudul = useId();
  useModal(onTutup, (ev) => {
    if (ev.key === "ArrowLeft") onSebelum?.();
    if (ev.key === "ArrowRight") onBerikut?.();
  });

  return (
    <Lembar
      idJudul={idJudul}
      onTutup={onTutup}
      lebar="max-w-lg"
      judul={
        <>
          <AvatarPegawai p={e.p} online={false} ukuran="h-9 w-9" teks="text-xs" />
          <span className="truncate">{e.p.nama}</span>
        </>
      }
    >
      <IsiDetail key={e.p.id} e={e} dari={dari} sampai={sampai} hariIni={hariIni} labelPeriode={labelPeriode} namaDivisi={namaDivisi} rows={rows} />

      {total > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => onSebelum?.()}
            disabled={!onSebelum}
            className="flex min-h-[40px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-text hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={18} aria-hidden="true" /> Sebelumnya
          </button>
          <span className="text-xs text-gray-400" aria-live="polite">
            {posisi + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => onBerikut?.()}
            disabled={!onBerikut}
            className="flex min-h-[40px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-text hover:bg-gray-100 disabled:opacity-30"
          >
            Berikutnya <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </Lembar>
  );
}

function IsiDetail({
  e,
  dari,
  sampai,
  hariIni,
  labelPeriode,
  namaDivisi,
  rows,
}: {
  e: EntriTim<Profile, BarisAbsensi>;
  dari: string;
  sampai: string;
  hariIni: string;
  labelPeriode: string;
  namaDivisi: string | null;
  rows: BarisAbsensi[];
}) {
  const akhir = sampai < hariIni ? sampai : hariIni < dari ? dari : hariIni;
  const [ym, setYm] = useState(akhir.slice(0, 7));
  const [dipilih, setDipilih] = useState<string | null>(null);
  const [mengekspor, setMengekspor] = useState(false);
  const h = e.ringkas.hitung;
  const masuk = h.hadir + h.telat + h.dinas;
  const tingkat = e.skor !== null ? tingkatKerajinan(e.skor) : null;

  // kalender satu bulan; tanggal di luar periode tampil polos
  const hari = useMemo(
    () =>
      susunBulan(ym, rows, e.p, hariIni).map((x): HariRekap<BarisAbsensi> =>
        x.tanggal < dari || x.tanggal > sampai ? { tanggal: x.tanggal, jenis: "kosong", row: null } : x
      ),
    [ym, rows, e.p, hariIni, dari, sampai]
  );
  const hariDipilih = dipilih ? hari.find((x) => x.tanggal === dipilih) ?? null : null;

  async function ekspor() {
    setMengekspor(true);
    try {
      await unduhExcelRekap({
        namaFile: `rekap-${e.p.nama}-${dari}_sd_${sampai}`,
        judul: `Rekap Absensi ${e.p.nama} — Dinas Pariwisata Kota Yogyakarta`,
        periode: labelPeriode,
        sertakanNama: false,
        rows: [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
        ringkasan: ringkasanExcel(e.ringkas),
      });
    } finally {
      setMengekspor(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mt-1 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-500">{[e.p.jabatan, namaDivisi].filter(Boolean).join(" · ") || e.p.email}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-masuk">{e.skor !== null ? `${e.skor}%` : "—"}</span>
            {tingkat ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tingkat.cls}`}>{tingkat.label}</span>
            ) : (
              <span className="text-xs text-gray-400">Tidak wajib absen</span>
            )}
          </p>
          <p className="text-[11px] text-gray-500">
            {e.ringkas.hariWajib ? `${masuk} dari ${e.ringkas.hariWajib} hari kerja masuk` : "Belum ada hari kerja"} · {formatDurasi(e.ringkas.menitKerja)} kerja
          </p>
        </div>
        <button
          type="button"
          onClick={() => void ekspor()}
          disabled={mengekspor}
          className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white pl-1 pr-3 text-xs font-semibold text-brand-text shadow-sm ring-1 ring-black/10 transition active:scale-95 disabled:opacity-60"
        >
          <img src="/icon_excel.png" alt="" className="h-7 w-7 object-contain" />
          {mengekspor ? "Menyiapkan…" : "Excel"}
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {KOTAK_REKAP.map((k) => (
          <div key={k.id} className={`flex flex-col items-center rounded-xl px-1 py-1.5 ${WARNA_ANGKA[k.id]}`}>
            <span className="text-base font-bold leading-none">{h[k.id]}</span>
            <span className="mt-0.5 text-center text-[10px] leading-tight opacity-80">{k.label}</span>
          </div>
        ))}
      </div>

      <KalenderRekap
        ym={ym}
        hari={hari}
        hariIni={hariIni}
        sorot={null}
        bisaMundur={ym > dari.slice(0, 7)}
        bisaMaju={ym < sampai.slice(0, 7)}
        onGeser={(n) => {
          setYm((x) => geserBulanYm(x, n));
          setDipilih(null);
        }}
        onKeBulanIni={null}
        onPilih={setDipilih}
        bacaSaja
      />

      {hariDipilih && <InfoHari key={hariDipilih.tanggal} h={hariDipilih} hariIni={hariIni} />}
    </div>
  );
}

function InfoHari({ h, hariIni }: { h: HariRekap<BarisAbsensi>; hariIni: string }) {
  const r = h.row;
  const g = GAYA_HARI[h.jenis];
  const [galat, setGalat] = useState<string | null>(null);
  return (
    <section className="anim-buka flex flex-col gap-2 rounded-2xl bg-gray-50 p-3 text-sm" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-brand-text">{fmtPanjang.format(new Date(`${h.tanggal}T00:00:00Z`))}</p>
        {g.label && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.chip}`}>{g.label}</span>}
      </div>
      {r?.masuk_at ? (
        <p className="text-brand-text">
          <b className="tabular-nums">{jamWIB(r.masuk_at)}</b> – <b className="tabular-nums">{r.keluar_at ? jamWIB(r.keluar_at) : "—"}</b>
          <span className="text-gray-500">
            {" "}
            · {r.keluar_at ? formatDurasi((Date.parse(r.keluar_at) - Date.parse(r.masuk_at)) / 60_000) : h.tanggal === hariIni ? "sedang bekerja" : "tidak absen pulang"} ·{" "}
            {r.masuk_mode === "luar" ? "Dinas Luar" : "Di Kantor"}
          </span>
        </p>
      ) : h.jenis === "tidak" ? (
        <p className="text-gray-600">Tidak ada absen dan tidak ada keterangan.</p>
      ) : null}
      {r?.masuk_catatan && <p className="text-xs text-gray-600">Catatan masuk: {teksDenganLink(r.masuk_catatan)}</p>}
      {r?.catatan_klarifikasi && (
        <p className="flex gap-1.5 text-xs text-gray-700">
          <MessageSquareText size={14} className="mt-px shrink-0 text-brand-masuk" aria-hidden="true" />
          <span className="break-words">{teksDenganLink(r.catatan_klarifikasi)}</span>
        </p>
      )}
      {r?.bukti_url && (
        <button
          type="button"
          onClick={() => (buktiDiStorage(r.bukti_url) ? bukaBukti(r.bukti_url!).catch((x: Error) => setGalat(x.message)) : window.open(r.bukti_url!, "_blank", "noreferrer"))}
          className="self-start text-xs font-semibold text-brand-masuk underline"
        >
          Lihat bukti
        </button>
      )}
      {r?.ditandai && (
        <p className="flex items-center gap-1 text-xs font-semibold text-red-700">
          <Flag size={12} className="fill-red-500 text-red-500" aria-hidden="true" /> Ditandai{r.alasan_tanda ? `: ${r.alasan_tanda}` : ""}
        </p>
      )}
      {galat && <p className="text-xs text-red-600">{galat}</p>}
    </section>
  );
}
