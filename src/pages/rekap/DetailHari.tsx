import { useEffect, useId, useRef, useState, type TouchEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Flag, MessageSquareText } from "lucide-react";
import Lembar from "../../components/Lembar";
import InputBukti from "../../components/InputBukti";
import { useModal } from "../../lib/useModal";
import { kirimKlarifikasiAbsensi } from "../../lib/absensi";
import { buktiDiStorage, urlBukti } from "../../lib/buktiIzin";
import { teksDenganLink } from "../../lib/linkify";
import { formatDurasi } from "../../lib/statusHariIni";
import type { BarisAbsensi } from "../../lib/rekap";
import type { HariRekap } from "../../lib/rekapSayaAturan";
import { GAYA_HARI, jamWIB } from "./gaya";

const fmtPanjang = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const AMBANG_GESER = 60;
const mode = (m: string | null) => (m === "luar" ? "Dinas Luar" : "Di Kantor");

/** Detail satu hari di Rekap pegawai: jam, status, keterangan (bisa ditambah/diubah). Geser untuk hari lain. */
export default function DetailHari({
  hari,
  hariIni,
  posisi,
  total,
  onSebelum,
  onBerikut,
  onTutup,
  onUbah,
}: {
  hari: HariRekap<BarisAbsensi>;
  hariIni: string;
  posisi: number;
  total: number;
  onSebelum: (() => void) | null;
  onBerikut: (() => void) | null;
  onTutup: () => void;
  onUbah: () => Promise<void>;
}) {
  const idJudul = useId();
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);
  const sentuh = useRef<{ x: number; y: number } | null>(null);
  const isi = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isi.current?.closest("[role=dialog]")?.scrollTo({ top: 0 });
  }, [hari.tanggal]);

  function pindah(ke: "kanan" | "kiri") {
    const aksi = ke === "kanan" ? onBerikut : onSebelum;
    if (!aksi) return;
    setArah(ke);
    aksi();
  }
  const mengisi = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("input, textarea, [data-tanpa-geser]");

  useModal(onTutup, (e) => {
    if (mengisi(e.target) || document.querySelector("[role=dialog] [data-tanpa-geser]")) return;
    if (e.key === "ArrowLeft") pindah("kiri");
    if (e.key === "ArrowRight") pindah("kanan");
  });

  function onTouchStart(e: TouchEvent) {
    if (mengisi(e.target) || document.querySelector("[role=dialog] [data-tanpa-geser]")) return;
    const t = e.touches[0];
    sentuh.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: TouchEvent) {
    const awal = sentuh.current;
    sentuh.current = null;
    if (!awal) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - awal.x;
    if (Math.abs(dx) < AMBANG_GESER || Math.abs(dx) < Math.abs(t.clientY - awal.y)) return;
    pindah(dx < 0 ? "kanan" : "kiri");
  }

  const r = hari.row;
  const g = GAYA_HARI[hari.jenis];
  const mendatang = hari.tanggal > hariIni;

  return (
    <Lembar
      idJudul={idJudul}
      onTutup={onTutup}
      judul={
        <>
          <CalendarDays size={20} className="shrink-0 text-brand-masuk" aria-hidden="true" />
          <span className="truncate">{fmtPanjang.format(new Date(`${hari.tanggal}T00:00:00Z`))}</span>
        </>
      }
    >
      <div key={hari.tanggal} ref={isi} className={`flex flex-col gap-3 ${arah ? `anim-geser-${arah}` : ""}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="-mt-1 flex flex-wrap items-center gap-1.5">
          {g.label && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${g.chip}`}>{g.label}</span>}
          {r?.ditandai && (
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
              <Flag size={11} className="fill-red-500 text-red-500" aria-hidden="true" /> Ditandai admin untuk ditinjau
            </span>
          )}
        </div>

        {r?.masuk_at ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-gray-50 p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Masuk</p>
              <p className="text-2xl font-bold tabular-nums text-brand-text">{jamWIB(r.masuk_at)}</p>
              <p className="text-[11px] text-gray-500">{mode(r.masuk_mode)}</p>
            </div>
            <p className="text-center text-[11px] font-medium text-gray-400">
              {r.keluar_at ? formatDurasi((Date.parse(r.keluar_at) - Date.parse(r.masuk_at)) / 60_000) : hari.tanggal === hariIni ? "sedang bekerja" : "—"}
            </p>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pulang</p>
              <p className={`text-2xl font-bold tabular-nums ${r.keluar_at ? "text-brand-text" : "text-gray-300"}`}>{r.keluar_at ? jamWIB(r.keluar_at) : "--.--"}</p>
              <p className="text-[11px] text-gray-500">{r.keluar_at ? mode(r.keluar_mode) : "belum absen pulang"}</p>
            </div>
          </div>
        ) : hari.jenis === "tidak" ? (
          <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">Kamu tidak tercatat absen di hari ini. Lupa absen atau sedang izin? Beri keterangan di bawah.</p>
        ) : mendatang ? (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">Izin terjadwal. Untuk mengubah atau membatalkan, pakai tombol Izin/Sakit di Beranda.</p>
        ) : null}

        {(r?.masuk_catatan || r?.keluar_catatan) && (
          <div className="flex flex-col gap-1 text-xs text-gray-600">
            {r.masuk_catatan && <p>Catatan masuk: {teksDenganLink(r.masuk_catatan)}</p>}
            {r.keluar_catatan && <p>Catatan pulang: {teksDenganLink(r.keluar_catatan)}</p>}
          </div>
        )}

        {!mendatang ? <Keterangan key={`${hari.tanggal}:${r?.catatan_klarifikasi ?? ""}:${r?.bukti_url ?? ""}`} hari={hari} onUbah={onUbah} /> : r?.catatan_klarifikasi && <KeteranganTampil row={r} />}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => pindah("kiri")}
            disabled={!onSebelum}
            className="flex min-h-[40px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-text hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={18} aria-hidden="true" /> Lebih baru
          </button>
          <span className="text-xs text-gray-400" aria-live="polite">
            {posisi + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => pindah("kanan")}
            disabled={!onBerikut}
            className="flex min-h-[40px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-text hover:bg-gray-100 disabled:opacity-30"
          >
            Lebih lama <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </Lembar>
  );
}

function KeteranganTampil({ row }: { row: BarisAbsensi }) {
  const [bukti, setBukti] = useState<string | null>(null);
  useEffect(() => {
    if (!row.bukti_url || !buktiDiStorage(row.bukti_url)) return;
    let aktif = true;
    urlBukti(row.bukti_url)
      .then((u) => aktif && setBukti(u))
      .catch(() => undefined);
    return () => {
      aktif = false;
    };
  }, [row.bukti_url]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-lnd-sky p-3 text-sm text-brand-text">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-masuk">
        <MessageSquareText size={14} aria-hidden="true" /> Keterangan kamu
      </p>
      <p className="break-words">{teksDenganLink(row.catatan_klarifikasi ?? "")}</p>
      {bukti && (
        <a href={bukti} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-white" title="Buka foto bukti ukuran penuh">
          <img src={bukti} alt="Foto bukti" className="max-h-48 w-full object-contain" />
        </a>
      )}
      {row.bukti_url && !buktiDiStorage(row.bukti_url) && (
        <a href={row.bukti_url} target="_blank" rel="noreferrer" className="break-all text-xs font-semibold text-brand-masuk underline">
          🔗 Buka link bukti
        </a>
      )}
    </div>
  );
}

function Keterangan({ hari, onUbah }: { hari: HariRekap<BarisAbsensi>; onUbah: () => Promise<void> }) {
  const r = hari.row;
  const [buka, setBuka] = useState(false);
  const [catatan, setCatatan] = useState(r?.catatan_klarifikasi ?? "");
  const [bukti, setBukti] = useState(r?.bukti_url ?? "");
  const [mengunggah, setMengunggah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function simpan() {
    if (catatan.trim().length < 3) return setGalat("Isi keterangan dulu (minimal 3 huruf).");
    setMenyimpan(true);
    setGalat(null);
    try {
      await kirimKlarifikasiAbsensi(hari.tanggal, catatan.trim(), bukti);
      await onUbah();
      setBuka(false);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan keterangan.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (!buka) {
    return (
      <>
        {r?.catatan_klarifikasi && <KeteranganTampil row={r} />}
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold text-brand-masuk ring-1 ring-brand-masuk/25 transition active:scale-[0.98]"
        >
          <MessageSquareText size={16} aria-hidden="true" />
          {r?.catatan_klarifikasi ? "Ubah keterangan" : hari.jenis === "tidak" ? "Beri keterangan (dicatat izin)" : "Tambah keterangan"}
        </button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-3" data-tanpa-geser>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">Keterangan</span>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={3}
          maxLength={500}
          autoFocus
          placeholder="Contoh: Sakit demam, surat keterangan dokter terlampir"
          className="rounded-xl border border-gray-200 bg-white p-2.5 text-sm"
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">Foto bukti (opsional — mis. surat dokter)</span>
        <InputBukti nilai={bukti} onUbah={setBukti} onSibuk={setMengunggah} />
      </div>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setBuka(false);
            setGalat(null);
          }}
          className="min-h-[40px] flex-1 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => void simpan()}
          disabled={menyimpan || mengunggah}
          className="min-h-[40px] flex-1 rounded-xl bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </div>
  );
}
