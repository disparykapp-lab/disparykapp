import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, MessageSquareText } from "lucide-react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { useAuth } from "../../contexts/AuthContext";
import { tanggalHariIniWIB } from "../../lib/absensi";
import { ambilAbsensiSaya, type BarisAbsensi } from "../../lib/rekap";
import { unduhExcelRekap } from "../../lib/excel";
import { formatDurasi } from "../../lib/statusHariIni";
import {
  KOTAK_REKAP,
  geserBulanYm,
  hitungRekapSaya,
  rentangBulanYm,
  susunBulan,
  type HariRekap,
  type JenisRekap,
} from "../../lib/rekapSayaAturan";
import KalenderRekap from "./KalenderRekap";
import DetailHari from "./DetailHari";
import { GAYA_HARI, jamWIB } from "./gaya";

const BULAN_KE_BELAKANG = 12;
const BULAN_KE_DEPAN = 2; // izin bisa diajukan sampai 60 hari ke depan
const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtHari = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" });
const fmtTgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

/** Kotak ringkasan = legenda warna kalender = tombol saring. */
const GAYA_KOTAK: Record<JenisRekap, { diam: string; aktif: string }> = {
  hadir: { diam: "bg-green-50 ring-1 ring-green-200", aktif: "bg-green-600 text-white" },
  telat: { diam: "bg-white ring-2 ring-amber-400", aktif: "bg-amber-400 text-amber-950" },
  dinas: { diam: "bg-sky-50 ring-1 ring-sky-200", aktif: "bg-sky-600 text-white" },
  izin: { diam: "bg-white ring-2 ring-red-500", aktif: "bg-red-500 text-white" },
  tidak: { diam: "bg-white ring-2 ring-gray-900", aktif: "bg-gray-900 text-white" },
};

/** Rekap absensi milik sendiri (role pegawai): kalender berwarna per bulan + riwayat. */
export default function RekapSaya() {
  const { profile } = useAuth();
  const [hariIni] = useState(tanggalHariIniWIB);
  const bulanIni = hariIni.slice(0, 7);
  const [ym, setYm] = useState(bulanIni);
  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [dimuat, setDimuat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sorot, setSorot] = useState<JenisRekap | null>(null);
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [mengekspor, setMengekspor] = useState(false);
  const nomor = useRef(0);

  const muat = useCallback(async () => {
    if (!profile) return;
    const ke = ++nomor.current;
    const { dari, sampai } = rentangBulanYm(ym);
    let data: BarisAbsensi[] = [];
    let galat: string | null = null;
    try {
      data = await ambilAbsensiSaya(profile.id, dari, sampai);
    } catch (e) {
      galat = e instanceof Error ? e.message : "Gagal memuat rekap.";
    }
    if (ke !== nomor.current) return;
    setRows(data);
    setError(galat);
    setDimuat(ym);
  }, [profile, ym]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const loading = dimuat !== ym;
  const hari = useMemo(() => (profile ? susunBulan(ym, rows, profile, hariIni) : []), [ym, rows, profile, hariIni]);
  const ring = useMemo(() => hitungRekapSaya(hari, hariIni), [hari, hariIni]);
  const daftar = useMemo(
    () => hari.filter((h) => (h.row || h.jenis === "tidak") && (!sorot || h.jenis === sorot)).reverse() as HariRekap<BarisAbsensi>[],
    [hari, sorot]
  );

  const minYm = geserBulanYm(bulanIni, -BULAN_KE_BELAKANG);
  const maxYm = geserBulanYm(bulanIni, BULAN_KE_DEPAN);
  const namaBulan = fmtBulan.format(keDate(`${ym}-01`));
  const masuk = ring.hitung.hadir + ring.hitung.telat + ring.hitung.dinas;

  function gantiBulan(baru: string) {
    setYm(baru);
    setDibuka(null);
  }

  async function ekspor() {
    setMengekspor(true);
    try {
      const { dari, sampai } = rentangBulanYm(ym);
      await unduhExcelRekap({
        namaFile: `rekap-${profile?.nama ?? "saya"}-${ym}`,
        judul: "Rekap Absensi — Dinas Pariwisata Kota Yogyakarta",
        periode: `${fmtTgl.format(keDate(dari))} – ${fmtTgl.format(keDate(sampai))}`,
        sertakanNama: false,
        rows: [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
        ringkasan: {
          hadir: ring.hitung.hadir,
          telat: ring.hitung.telat,
          dinasLuar: ring.hitung.dinas,
          izin: ring.hitung.izin,
          tidakAbsen: ring.hitung.tidak,
          totalJamKerja: ring.menitKerja / 60,
        },
      });
    } finally {
      setMengekspor(false);
    }
  }

  const posisi = dibuka ? daftar.findIndex((h) => h.tanggal === dibuka) : -1;
  const hariDibuka = posisi >= 0 ? daftar[posisi] : null;
  const tutup = useCallback(() => setDibuka(null), []);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Rekap Absensi" kembaliKe="/beranda" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
            <img src="/rekap/rekap.png" alt="" className="h-16 w-16 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Kehadiran {namaBulan}</p>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-bold text-brand-masuk">{loading || ring.persen === null ? "–" : `${ring.persen}%`}</span>
                <span className="text-xs text-gray-500">
                  {loading ? "" : ring.hariWajib ? `${masuk} dari ${ring.hariWajib} hari kerja` : "Belum ada hari kerja"}
                </span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand-masuk transition-[width] duration-500" style={{ width: `${loading ? 0 : (ring.persen ?? 0)}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">Total {formatDurasi(ring.menitKerja)} kerja</p>
            </div>
          </section>

          <div className="grid grid-cols-5 gap-2" role="group" aria-label="Saring kehadiran">
            {KOTAK_REKAP.map((k) => {
              const aktif = sorot === k.id;
              const g = GAYA_KOTAK[k.id];
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => setSorot(aktif ? null : k.id)}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition active:scale-95 ${
                    aktif ? `${g.aktif} shadow-md` : `${g.diam} text-brand-text shadow-sm`
                  }`}
                >
                  <span className="text-xl font-bold leading-none">{loading ? "–" : ring.hitung[k.id]}</span>
                  <span className={`mt-1 text-[11px] font-medium leading-tight ${aktif ? "" : "text-gray-500"}`}>{k.label}</span>
                </button>
              );
            })}
          </div>

          <KalenderRekap
            ym={ym}
            hari={hari}
            hariIni={hariIni}
            sorot={sorot}
            bisaMundur={ym > minYm}
            bisaMaju={ym < maxYm}
            onGeser={(n) => gantiBulan(geserBulanYm(ym, n))}
            onKeBulanIni={ym !== bulanIni ? () => gantiBulan(bulanIni) : null}
            onPilih={(t) => {
              setSorot(null);
              setDibuka(t);
            }}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-brand-text">
              Riwayat <span className="font-normal capitalize text-gray-400">{namaBulan}</span>
            </h2>
            <button
              type="button"
              onClick={() => void ekspor()}
              disabled={mengekspor || loading}
              className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white pl-1 pr-3 text-xs font-semibold text-brand-text shadow-sm ring-1 ring-black/5 transition active:scale-95 disabled:opacity-60"
            >
              <img src="/icon_excel.png" alt="" className="h-7 w-7 object-contain" />
              {mengekspor ? "Menyiapkan…" : "Ekspor Excel"}
            </button>
          </div>

          {loading ? (
            <Loading teks="Memuat rekap..." />
          ) : daftar.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              {sorot ? `Tidak ada hari "${KOTAK_REKAP.find((k) => k.id === sorot)?.label}" di bulan ini.` : "Belum ada data absen di bulan ini."}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5 px-0.5">
              {daftar.map((h) => (
                <KartuHari key={h.tanggal} h={h} hariIni={hariIni} onBuka={() => setDibuka(h.tanggal)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {hariDibuka && (
        <DetailHari
          hari={hariDibuka}
          hariIni={hariIni}
          posisi={posisi}
          total={daftar.length}
          onSebelum={posisi > 0 ? () => setDibuka(daftar[posisi - 1].tanggal) : null}
          onBerikut={posisi < daftar.length - 1 ? () => setDibuka(daftar[posisi + 1].tanggal) : null}
          onTutup={tutup}
          onUbah={muat}
        />
      )}
    </div>
  );
}

function KartuHari({ h, hariIni, onBuka }: { h: HariRekap<BarisAbsensi>; hariIni: string; onBuka: () => void }) {
  const r = h.row;
  const g = GAYA_HARI[h.jenis];
  const mode = (m: string | null) => (m === "luar" ? "Dinas Luar" : "Di Kantor");
  let judul = "Tidak ada absen";
  let sub = "Ketuk untuk memberi keterangan";
  if (r?.masuk_at) {
    judul = r.keluar_at ? `${jamWIB(r.masuk_at)} – ${jamWIB(r.keluar_at)}` : `Masuk ${jamWIB(r.masuk_at)}`;
    sub = r.keluar_at
      ? `${formatDurasi((Date.parse(r.keluar_at) - Date.parse(r.masuk_at)) / 60_000)} · ${mode(r.masuk_mode)}`
      : `${mode(r.masuk_mode)} · ${h.tanggal === hariIni ? "sedang bekerja" : "tidak absen pulang"}`;
  } else if (h.jenis === "izin") {
    judul = h.tanggal > hariIni ? "Izin terjadwal" : "Izin/Sakit";
    sub = r?.catatan_klarifikasi?.trim() || "Tanpa keterangan";
  }
  const d = keDate(h.tanggal);
  return (
    <button
      type="button"
      onClick={onBuka}
      aria-haspopup="dialog"
      className={`flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white p-2.5 pr-3 text-left transition active:scale-[0.98] ${g.kartu}`}
    >
      <span className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 ${h.tanggal === hariIni ? "bg-brand-masuk text-white" : "bg-gray-50 text-brand-text"}`}>
        <span className={`text-[10px] font-bold uppercase ${h.tanggal === hariIni ? "text-white/80" : "text-gray-400"}`}>{fmtHari.format(d)}</span>
        <span className="text-lg font-bold leading-none">{d.getUTCDate()}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-brand-text">{judul}</span>
        <span className="truncate text-xs text-gray-500">{sub}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.chip}`}>{g.label}</span>
        <span className="flex items-center gap-1 text-gray-400">
          {r?.catatan_klarifikasi && h.jenis !== "izin" && <MessageSquareText size={13} aria-label="Ada keterangan" />}
          {r?.ditandai && <Flag size={13} className="fill-red-500 text-red-500" aria-label="Ditandai admin" />}
        </span>
      </span>
    </button>
  );
}
