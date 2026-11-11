import { useEffect, useId, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Flag, ImageOff, MapPin } from "lucide-react";
import { tandaiAbsensi } from "../../../lib/absensi";
import { buktiDiStorage, urlBukti } from "../../../lib/buktiIzin";
import { teksDenganLink } from "../../../lib/linkify";
import type { BarisAbsensi } from "../../../lib/rekap";
import type { KartuTinjau } from "../../../lib/tinjauAbsenAturan";
import { ChipStatus, FotoKecil } from "./KartuAbsen";
import Lembar from "../../../components/Lembar";
import { useModal } from "../../../lib/useModal";
import { jam } from "./util";

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const AMBANG_GESER = 60;

/**
 * Detail satu absen yang muncul ke depan (bukan memanjang ke bawah): foto
 * masuk & pulang, jam, GPS, IP, keterangan, dan tanda tinjau. Geser kiri/kanan
 * (atau tombol panah) untuk pindah ke pegawai berikutnya.
 */
export default function DetailAbsen({
  kartu,
  posisi,
  total,
  fotoUrl,
  fotoProfil,
  namaDivisi,
  onSebelum,
  onBerikut,
  onTutup,
  onUbah,
}: {
  kartu: KartuTinjau<BarisAbsensi> & { row: BarisAbsensi };
  posisi: number;
  total: number;
  fotoUrl: Record<string, string | null>;
  fotoProfil: string | null | undefined;
  namaDivisi: string | null;
  onSebelum: (() => void) | null;
  onBerikut: (() => void) | null;
  onTutup: () => void;
  onUbah: () => Promise<void>;
}) {
  const idJudul = useId();
  const r = kartu.row;
  const sentuh = useRef<{ x: number; y: number } | null>(null);
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);

  const isi = useRef<HTMLDivElement>(null);
  // pindah orang = mulai lagi dari atas lembar, bukan di posisi gulir orang sebelumnya
  useEffect(() => {
    isi.current?.closest("[role=dialog]")?.scrollTo({ top: 0 });
  }, [kartu.kunci]);

  function pindah(ke: "kanan" | "kiri") {
    const aksi = ke === "kanan" ? onBerikut : onSebelum;
    if (!aksi) return;
    setArah(ke);
    aksi();
  }

  useModal(onTutup, (e) => {
    if ((e.target as HTMLElement | null)?.closest?.("input, textarea")) return;
    if (e.key === "ArrowLeft") pindah("kiri");
    if (e.key === "ArrowRight") pindah("kanan");
  });

  function onTouchStart(e: TouchEvent) {
    if ((e.target as HTMLElement).closest("input, textarea")) return;
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

  const izinTanpaAbsen = r.status === "izin" && !r.masuk_at;

  return (
    <Lembar
      idJudul={idJudul}
      onTutup={onTutup}
      lebar="max-w-lg"
      judul={
        <>
          <FotoKecil url={null} fotoProfil={fotoProfil} nama={kartu.nama} kategori={kartu.kategori} ukuran="h-9 w-9" />
          <span className="truncate">{kartu.nama}</span>
        </>
      }
    >
      <div key={kartu.kunci} ref={isi} className={`flex flex-col gap-3 ${arah ? `anim-geser-${arah}` : ""}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="-mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span>{fmtTanggal.format(new Date(`${r.tanggal}T00:00:00Z`))}</span>
          {namaDivisi && <span>· {namaDivisi}</span>}
          <ChipStatus kategori={kartu.kategori} status={r.status} />
          {kartu.kategori === "hadir" && r.status !== "dinas_luar" && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Tepat waktu</span>
          )}
        </div>

        {!izinTanpaAbsen && (
          <div className="grid grid-cols-2 gap-2">
            <FotoSesi judul="Masuk" at={r.masuk_at} path={r.masuk_foto_path} fotoUrl={fotoUrl} />
            <FotoSesi judul="Pulang" at={r.keluar_at} path={r.keluar_foto_path} fotoUrl={fotoUrl} />
          </div>
        )}

        {(r.catatan_klarifikasi || r.bukti_url) && <Keterangan row={r} />}

        {!izinTanpaAbsen && (
          <div className="flex flex-col gap-2">
            <InfoSesi
              judul="Masuk"
              at={r.masuk_at}
              mode={r.masuk_mode}
              akurasi={r.masuk_akurasi}
              ip={r.masuk_ip}
              catatan={r.masuk_catatan}
              alamat={r.masuk_alamat}
              lat={r.masuk_lat}
              lng={r.masuk_lng}
            />
            <InfoSesi
              judul="Pulang"
              at={r.keluar_at}
              mode={r.keluar_mode}
              akurasi={r.keluar_akurasi}
              ip={r.keluar_ip}
              catatan={r.keluar_catatan}
              alamat={r.keluar_alamat}
              lat={r.keluar_lat}
              lng={r.keluar_lng}
            />
          </div>
        )}

        <BagianTanda key={`${r.id}:${r.ditandai}`} row={r} onUbah={onUbah} />
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => pindah("kiri")}
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
            onClick={() => pindah("kanan")}
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

function FotoSesi({ judul, at, path, fotoUrl }: { judul: string; at: string | null; path: string | null; fotoUrl: Record<string, string | null> }) {
  const url = path ? fotoUrl[path] : null;
  const label = at ? `${judul} · ${jam(at)}` : judul;
  return (
    <figure className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
      {path && url ? (
        <a href={url} target="_blank" rel="noreferrer" title="Buka foto ukuran penuh">
          <img src={url} alt={`Foto ${judul.toLowerCase()}`} className="h-full w-full object-cover" />
        </a>
      ) : path && url === undefined ? (
        <span className="block h-full w-full animate-pulse" aria-hidden="true" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center text-xs text-gray-400">
          <ImageOff size={22} aria-hidden="true" />
          {!at ? `Belum absen ${judul.toLowerCase()}` : path ? "Foto tidak bisa dibuka" : "Foto sudah dihapus otomatis (retensi habis)"}
        </div>
      )}
      <figcaption className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
        {label}
      </figcaption>
    </figure>
  );
}

function InfoSesi({
  judul,
  at,
  mode,
  akurasi,
  ip,
  catatan,
  alamat,
  lat,
  lng,
}: {
  judul: string;
  at: string | null;
  mode: string | null;
  akurasi: number | null;
  ip: string | null;
  catatan: string | null;
  alamat: string | null;
  lat: number | null;
  lng: number | null;
}) {
  if (!at) {
    return <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-400">{judul}: belum absen</p>;
  }
  // Absen "Di Kantor" sudah tervalidasi radius kantor — peta cuma untuk Dinas Luar.
  const petaUrl =
    mode !== "kantor" && lat != null && lng != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.003}%2C${lat - 0.003}%2C${lng + 0.003}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lng}`
      : null;
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-2.5">
      <p className="text-sm font-semibold text-brand-text">
        {judul} · {jam(at, true)} · {mode === "kantor" ? "Di Kantor" : "Dinas Luar"}
      </p>
      <p className="text-xs text-gray-500">
        Akurasi GPS: {akurasi != null ? `${Math.round(akurasi)} m` : "-"} · IP: {ip ?? "-"}
      </p>
      {alamat && (
        <p className="flex items-start gap-1 text-xs text-gray-500">
          <MapPin size={13} className="mt-px shrink-0" aria-hidden="true" /> {alamat}
        </p>
      )}
      {catatan && <p className="text-xs text-gray-600">Catatan: {teksDenganLink(catatan)}</p>}
      {petaUrl && <iframe title={`Peta ${judul}`} src={petaUrl} loading="lazy" className="mt-1 aspect-video w-full rounded-lg border border-gray-200" />}
    </div>
  );
}

function Keterangan({ row }: { row: BarisAbsensi }) {
  const [bukti, setBukti] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const diStorage = buktiDiStorage(row.bukti_url);

  useEffect(() => {
    if (!row.bukti_url || !buktiDiStorage(row.bukti_url)) return;
    let aktif = true;
    urlBukti(row.bukti_url)
      .then((u) => aktif && setBukti(u))
      .catch((e: Error) => aktif && setGalat(e.message));
    return () => {
      aktif = false;
    };
  }, [row.bukti_url]);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-lnd-sky p-3 text-sm text-brand-text">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-masuk">Keterangan dari pegawai</p>
      {row.catatan_klarifikasi && <p>{teksDenganLink(row.catatan_klarifikasi)}</p>}
      {diStorage && bukti && (
        <a href={bukti} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-white" title="Buka foto bukti ukuran penuh">
          <img src={bukti} alt="Foto bukti" className="max-h-56 w-full object-contain" />
        </a>
      )}
      {diStorage && !bukti && !galat && <span className="h-24 animate-pulse rounded-xl bg-white/70" aria-hidden="true" />}
      {galat && <p className="text-xs text-red-600">{galat}</p>}
      {row.bukti_url && !diStorage && (
        <a href={row.bukti_url} target="_blank" rel="noreferrer" className="break-all text-xs font-semibold text-brand-masuk underline">
          🔗 Buka link bukti
        </a>
      )}
    </div>
  );
}

function BagianTanda({ row, onUbah }: { row: BarisAbsensi; onUbah: () => Promise<void> }) {
  const [buka, setBuka] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function simpan(ditandai: boolean) {
    if (ditandai && alasan.trim().length < 3) {
      setGalat("Isi alasan penandaan dulu (minimal 3 huruf).");
      return;
    }
    setMenyimpan(true);
    setGalat(null);
    try {
      await tandaiAbsensi(row.id, ditandai, ditandai ? alasan.trim() : null);
      await onUbah();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan tanda.");
      setMenyimpan(false);
    }
  }

  if (row.ditandai) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
        <p className="flex items-center gap-1.5 text-sm font-bold text-red-700">
          <Flag size={15} className="fill-red-500 text-red-500" aria-hidden="true" /> Ditandai untuk ditinjau
        </p>
        {row.alasan_tanda && <p className="text-sm text-red-800">{row.alasan_tanda}</p>}
        {galat && <p className="text-xs text-red-600">{galat}</p>}
        <button
          type="button"
          onClick={() => void simpan(false)}
          disabled={menyimpan}
          className="min-h-[40px] rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-700 disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan…" : "Batalkan tanda"}
        </button>
      </div>
    );
  }

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 transition active:scale-[0.98]"
      >
        <Flag size={15} aria-hidden="true" /> Tandai untuk ditinjau
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">Kenapa ditandai?</span>
        <textarea
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          rows={2}
          autoFocus
          placeholder="mis. lokasi mencurigakan / foto tidak jelas"
          className="rounded-lg border border-gray-300 bg-white p-2 text-sm"
        />
      </label>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setBuka(false);
            setGalat(null);
          }}
          className="min-h-[40px] flex-1 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-brand-text"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => void simpan(true)}
          disabled={menyimpan}
          className="min-h-[40px] flex-1 rounded-lg bg-red-600 text-sm font-semibold text-white disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan…" : "Tandai"}
        </button>
      </div>
    </div>
  );
}
