import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import SearchBarAnimasi from "../../components/SearchBarAnimasi";
import GrafikKerajinan from "../../components/GrafikKerajinan";
import LembarRentang from "../../components/LembarRentang";
import { supabase } from "../../lib/supabase";
import { tanggalHariIniWIB } from "../../lib/absensi";
import { ambilAbsensiTinjau } from "../../lib/tinjauAbsen";
import { unduhExcelRekap } from "../../lib/excel";
import { tingkatKerajinan, unduhGambarPeringkat } from "../../lib/peringkat";
import { formatDurasi } from "../../lib/statusHariIni";
import { labelRentang } from "../../lib/tinjauAbsenAturan";
import { KOTAK_REKAP, rentangBulanYm, type JenisRekap, type RingkasanSaya } from "../../lib/rekapSayaAturan";
import {
  MAKS_HARI_REKAP,
  batasRekap,
  bulanPenuh,
  geserPeriode,
  keEntriPeringkat,
  periodeCepat,
  saringTim,
  susunTim,
  totalTim,
  type EntriTim,
} from "../../lib/rekapTimAturan";
import type { BarisAbsensi } from "../../lib/rekap";
import type { Divisi, Profile } from "../../types/database";
import { AvatarPegawai } from "../admin/pegawai/KartuPegawai";
import DetailPegawaiRekap from "./DetailPegawaiRekap";

type Entri = EntriTim<Profile, BarisAbsensi>;

const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
/** "YYYY-MM-DD" → Date tengah malam lokal (untuk fungsi lama yang memakai Date). */
const keLokal = (ymd: string) => new Date(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));

const GAYA_KOTAK: Record<JenisRekap, { diam: string; aktif: string }> = {
  hadir: { diam: "bg-green-50 ring-1 ring-green-200", aktif: "bg-green-600 text-white" },
  telat: { diam: "bg-white ring-2 ring-amber-400", aktif: "bg-amber-400 text-amber-950" },
  dinas: { diam: "bg-sky-50 ring-1 ring-sky-200", aktif: "bg-sky-600 text-white" },
  izin: { diam: "bg-white ring-2 ring-red-500", aktif: "bg-red-500 text-white" },
  tidak: { diam: "bg-white ring-2 ring-gray-900", aktif: "bg-gray-900 text-white" },
};
const WARNA_BILAH: Record<JenisRekap, string> = {
  hadir: "bg-green-500",
  dinas: "bg-sky-500",
  telat: "bg-amber-400",
  izin: "bg-red-500",
  tidak: "bg-gray-900",
};
const URUT_BILAH: JenisRekap[] = ["hadir", "dinas", "telat", "izin", "tidak"];
const KATA: Record<JenisRekap, string> = { hadir: "hadir", dinas: "dinas luar", telat: "telat", izin: "izin", tidak: "tidak absen" };

/** Bilah warna sebaran kehadiran satu pegawai (hijau hadir … hitam tidak absen). */
export function BilahWarna({ r }: { r: RingkasanSaya }) {
  const total = r.hariWajib;
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
      {total > 0 && URUT_BILAH.map((k) => (r.hitung[k] ? <span key={k} className={WARNA_BILAH[k]} style={{ width: `${(r.hitung[k] / total) * 100}%` }} /> : null))}
    </span>
  );
}

/** Rekap absensi tim (admin): periode, divisi, kehadiran tim, podium, dan peringkat semua pegawai. */
export default function RekapTim({ aksi }: { aksi?: ReactNode }) {
  const [hariIni] = useState(tanggalHariIniWIB);
  const [periode, setPeriode] = useState(() => rentangBulanYm(hariIni.slice(0, 7)));
  const { dari, sampai } = periode;
  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [pegawai, setPegawai] = useState<Profile[] | null>(null);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [dimuat, setDimuat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [divisi, setDivisi] = useState("semua");
  const [cari, setCari] = useState("");
  const [sorot, setSorot] = useState<JenisRekap | null>(null);
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [kalender, setKalender] = useState(false);
  const [mengekspor, setMengekspor] = useState(false);
  const [mengunduh, setMengunduh] = useState(false);
  const nomor = useRef(0);

  useEffect(() => {
    let aktif = true;
    void Promise.all([
      supabase.from("profiles").select("*").eq("aktif", true).order("nama"),
      supabase.from("divisi").select("*").eq("aktif", true).order("nama"),
    ]).then(([p, d]) => {
      if (!aktif) return;
      if (p.error) setError(p.error.message);
      setPegawai((p.data as Profile[]) ?? []);
      setDivisiList((d.data as Divisi[]) ?? []);
    });
    return () => {
      aktif = false;
    };
  }, []);

  const muat = useCallback(async () => {
    const ke = ++nomor.current;
    let data: BarisAbsensi[] = [];
    let galat: string | null = null;
    try {
      data = await ambilAbsensiTinjau(dari, sampai);
    } catch (e) {
      galat = e instanceof Error ? e.message : "Gagal memuat rekap.";
    }
    if (ke !== nomor.current) return;
    setRows(data);
    setError(galat);
    setDimuat(`${dari}|${sampai}`);
  }, [dari, sampai]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const loading = !pegawai || dimuat !== `${dari}|${sampai}`;
  const cariNormal = cari.trim().toLowerCase();
  const pegawaiTampil = useMemo(
    () =>
      (pegawai ?? []).filter(
        (p) => (divisi === "semua" || p.divisi_id === divisi) && (!cariNormal || p.nama.toLowerCase().includes(cariNormal))
      ),
    [pegawai, divisi, cariNormal]
  );
  const entri = useMemo(() => susunTim(rows, pegawaiTampil, dari, sampai, hariIni), [rows, pegawaiTampil, dari, sampai, hariIni]);
  const wajib = useMemo(() => entri.filter((e) => e.wajib), [entri]);
  const total = useMemo(() => totalTim(wajib), [wajib]);
  const tampil = useMemo(() => saringTim(entri, sorot), [entri, sorot]);
  const podium = useMemo(() => wajib.filter((e) => e.skor !== null).map(keEntriPeringkat), [wajib]);
  const perDivisi = useMemo(() => {
    const n: Record<string, number> = {};
    for (const p of pegawai ?? []) if (p.divisi_id) n[p.divisi_id] = (n[p.divisi_id] ?? 0) + 1;
    return n;
  }, [pegawai]);

  const batas = batasRekap(hariIni, { mulai: null, selesai: null });
  const sebelum = geserPeriode(dari, sampai, -1);
  const berikut = geserPeriode(dari, sampai, 1);
  const label = bulanPenuh(dari, sampai)
    ? {
        judul: fmtBulan.format(keDate(dari)),
        ket: dari.slice(0, 7) === hariIni.slice(0, 7) ? "Bulan ini" : "",
      }
    : labelRentang(dari, sampai, hariIni);

  function gantiPeriode(p: { dari: string; sampai: string }) {
    setPeriode({ dari: p.dari, sampai: p.sampai });
    setDibuka(null);
  }

  async function ekspor() {
    setMengekspor(true);
    setError(null);
    try {
      const ids = new Set(pegawaiTampil.map((p) => p.id));
      await unduhExcelRekap({
        namaFile: `rekap-${dari}_sd_${sampai}`,
        judul: "Rekap Absensi — Dinas Pariwisata Kota Yogyakarta",
        periode: `${label.judul}`,
        sertakanNama: true,
        rows: rows.filter((r) => ids.has(r.user_id)).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (a.profiles?.nama ?? "").localeCompare(b.profiles?.nama ?? "")),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat file Excel.");
    } finally {
      setMengekspor(false);
    }
  }

  async function unduhPeringkat() {
    setMengunduh(true);
    setError(null);
    try {
      await unduhGambarPeringkat({ daftar: podium, dari: keLokal(dari), sampai: keLokal(sampai < hariIni ? sampai : hariIni) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat gambar peringkat.");
    } finally {
      setMengunduh(false);
    }
  }

  const posisi = dibuka ? tampil.findIndex((e) => e.p.id === dibuka) : -1;
  const eDibuka = posisi >= 0 ? tampil[posisi] : null;
  const tutup = useCallback(() => setDibuka(null), []);
  const namaDivisi = (id: string | null) => divisiList.find((d) => d.id === id)?.nama ?? null;

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Rekap Absensi" kembaliKe="/beranda" aksi={aksi} />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <KartuPeriode
            label={label}
            bisaMundur={sebelum.dari >= batas.min}
            bisaMaju={berikut.dari <= batas.max}
            onGeser={(n) => gantiPeriode(n < 0 ? sebelum : berikut)}
            cepat={periodeCepat(hariIni)}
            dari={dari}
            sampai={sampai}
            onPilih={gantiPeriode}
            onKalender={() => setKalender(true)}
          />

          <section className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
            <img src="/rekap/rekap.png" alt="" className="h-16 w-16 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Kehadiran tim</p>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-bold text-brand-masuk">{loading || total.persen === null ? "–" : `${total.persen}%`}</span>
                <span className="text-xs text-gray-500">{loading ? "" : `${wajib.length} pegawai · ${formatDurasi(total.menitKerja)} kerja`}</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand-masuk transition-[width] duration-500" style={{ width: `${loading ? 0 : (total.persen ?? 0)}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void ekspor()}
                  disabled={mengekspor || loading}
                  aria-label="Ekspor Excel tim"
                  className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white pl-1 pr-3 text-xs font-semibold text-brand-text shadow-sm ring-1 ring-black/10 transition active:scale-95 disabled:opacity-60"
                >
                  <img src="/icon_excel.png" alt="" className="h-7 w-7 object-contain" />
                  {mengekspor ? "Menyiapkan…" : "Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => void unduhPeringkat()}
                  disabled={mengunduh || loading || podium.length === 0}
                  aria-label="Unduh gambar peringkat terajin"
                  className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white pl-1.5 pr-3 text-xs font-semibold text-brand-text shadow-sm ring-1 ring-black/10 transition active:scale-95 disabled:opacity-60"
                >
                  <img src="/icon_album.png" alt="" className="h-6 w-6 object-contain" />
                  {mengunduh ? "Membuat…" : "Peringkat"}
                </button>
              </div>
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
                  <span className="text-xl font-bold leading-none">{loading ? "–" : total.hitung[k.id]}</span>
                  <span className={`mt-1 text-[11px] font-medium leading-tight ${aktif ? "" : "text-gray-500"}`}>{k.label}</span>
                </button>
              );
            })}
          </div>

          {!loading && !sorot && <GrafikKerajinan key={`${dari}|${sampai}|${divisi}`} daftar={podium} dikecualikan={entri.length - wajib.length} />}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pl-0.5 pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]"
              role="group"
              aria-label="Saring divisi"
            >
              {[{ id: "semua", nama: "Semua", n: pegawai?.length ?? 0 }, ...divisiList.map((d) => ({ id: d.id, nama: d.nama, n: perDivisi[d.id] ?? 0 }))].map((d) => {
                const aktif = divisi === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => setDivisi(d.id)}
                    className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 ${
                      aktif ? "bg-brand-masuk text-white shadow-sm" : "bg-white text-brand-text shadow-sm ring-1 ring-black/5"
                    }`}
                  >
                    {d.nama}
                    <span className={`rounded-full px-1.5 text-[11px] ${aktif ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>{d.n}</span>
                  </button>
                );
              })}
            </div>
            <div className="w-11 shrink-0 has-[input]:w-44 sm:has-[input]:w-56">
              <SearchBarAnimasi value={cari} onChange={setCari} placeholder="Cari nama…" />
            </div>
          </div>

          <h2 className="text-sm font-bold text-brand-text">
            {sorot ? `Paling sering ${KATA[sorot]}` : "Peringkat pegawai"}
            {!loading && <span className="ml-1.5 font-normal text-gray-400">{tampil.length} orang</span>}
          </h2>

          {loading ? (
            <Loading teks="Memuat rekap..." />
          ) : tampil.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              {sorot ? `Tidak ada yang ${KATA[sorot]} di periode ini 🎉` : "Tidak ada pegawai di sini."}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5 px-0.5">
              {tampil.map((e, i) => (
                <KartuPeringkat key={e.p.id} e={e} no={i + 1} sorot={sorot} namaDivisi={divisi === "semua" ? namaDivisi(e.p.divisi_id) : null} onBuka={() => setDibuka(e.p.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {kalender && (
        <LembarRentang
          dari={dari}
          sampai={sampai}
          hariIni={hariIni}
          cepat={periodeCepat(hariIni)}
          batas={(x) => batasRekap(hariIni, x)}
          maksHari={MAKS_HARI_REKAP}
          onTutup={() => setKalender(false)}
          onTerapkan={(d, s) => {
            setKalender(false);
            gantiPeriode({ dari: d, sampai: s });
          }}
        />
      )}

      {eDibuka && (
        <DetailPegawaiRekap
          e={eDibuka}
          dari={dari}
          sampai={sampai}
          hariIni={hariIni}
          labelPeriode={label.judul}
          namaDivisi={namaDivisi(eDibuka.p.divisi_id)}
          rows={rows.filter((r) => r.user_id === eDibuka.p.id)}
          posisi={posisi}
          total={tampil.length}
          onSebelum={posisi > 0 ? () => setDibuka(tampil[posisi - 1].p.id) : null}
          onBerikut={posisi < tampil.length - 1 ? () => setDibuka(tampil[posisi + 1].p.id) : null}
          onTutup={tutup}
        />
      )}
    </div>
  );
}

function KartuPeriode({
  label,
  bisaMundur,
  bisaMaju,
  onGeser,
  cepat,
  dari,
  sampai,
  onPilih,
  onKalender,
}: {
  label: { judul: string; ket: string };
  bisaMundur: boolean;
  bisaMaju: boolean;
  onGeser: (n: 1 | -1) => void;
  cepat: { id: string; label: string; dari: string; sampai: string }[];
  dari: string;
  sampai: string;
  onPilih: (p: { dari: string; sampai: string }) => void;
  onKalender: () => void;
}) {
  const sentuh = useRef<{ x: number; y: number } | null>(null);
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);

  function geser(n: 1 | -1) {
    if ((n < 0 && !bisaMundur) || (n > 0 && !bisaMaju)) return;
    setArah(n > 0 ? "kanan" : "kiri");
    onGeser(n);
  }
  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    sentuh.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: TouchEvent) {
    const awal = sentuh.current;
    sentuh.current = null;
    if (!awal) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - awal.x;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(t.clientY - awal.y)) return;
    geser(dx < 0 ? 1 : -1);
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => geser(-1)}
          disabled={!bisaMundur}
          aria-label="Periode sebelumnya"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div key={`${dari}|${sampai}`} className={`min-w-0 text-center ${arah ? `anim-geser-${arah}` : ""}`}>
          <p className="text-xs font-semibold text-brand-masuk">{label.ket || "Periode"}</p>
          <p className="truncate font-bold capitalize text-brand-text" aria-live="polite">
            {label.judul}
          </p>
        </div>
        <button
          type="button"
          onClick={() => geser(1)}
          disabled={!bisaMaju}
          aria-label="Periode berikutnya"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Periode cepat">
        {cepat.map((c) => {
          const aktif = c.dari === dari && c.sampai === sampai;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={aktif}
              onClick={() => onPilih(c)}
              className={`min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${
                aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 text-brand-text"
              }`}
            >
              {c.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onKalender}
          aria-haspopup="dialog"
          className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full bg-lnd-sky px-3 text-xs font-semibold text-brand-masuk transition active:scale-95"
        >
          <CalendarDays size={14} aria-hidden="true" /> Pilih tanggal
        </button>
      </div>
    </section>
  );
}

function KartuPeringkat({ e, no, sorot, namaDivisi, onBuka }: { e: Entri; no: number; sorot: JenisRekap | null; namaDivisi: string | null; onBuka: () => void }) {
  const h = e.ringkas.hitung;
  const rincian = URUT_BILAH.filter((k) => h[k] > 0).map((k) => `${h[k]} ${KATA[k]}`).join(" · ") || "Belum ada hari kerja";
  const tingkat = e.skor !== null ? tingkatKerajinan(e.skor) : null;
  const medali = !sorot && e.wajib && no <= 3 ? ["🥇", "🥈", "🥉"][no - 1] : null;
  return (
    <button
      type="button"
      onClick={onBuka}
      aria-haspopup="dialog"
      className={`flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white p-2.5 pr-3 text-left shadow-sm ring-1 ring-black/5 transition active:scale-[0.98] ${e.wajib ? "" : "opacity-70"}`}
    >
      <span className="w-6 shrink-0 text-center text-sm font-bold text-gray-400">{medali ?? (sorot || !e.wajib ? "" : no)}</span>
      <AvatarPegawai p={e.p} online={false} ukuran="h-11 w-11" teks="text-sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-semibold text-brand-text">{e.p.nama}</span>
        <BilahWarna r={e.ringkas} />
        <span className="truncate text-[11px] text-gray-500">{namaDivisi ? `${namaDivisi} · ${rincian}` : rincian}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {sorot ? (
          <span className="text-lg font-bold text-brand-text">{h[sorot]}×</span>
        ) : (
          <span className="text-lg font-bold text-brand-masuk">{e.skor !== null ? `${e.skor}%` : "—"}</span>
        )}
        {e.wajib ? (
          tingkat && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tingkat.cls}`}>{tingkat.label}</span>
        ) : (
          <span className="text-[10px] text-gray-400">Tidak wajib absen</span>
        )}
      </span>
    </button>
  );
}
