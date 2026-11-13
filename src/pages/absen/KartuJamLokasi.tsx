import { Check, Loader2, MapPinOff, RefreshCw } from "lucide-react";
import SobekanTiket from "../../components/SobekanTiket";
import { formatJarak, titikRadar, type AturanKantor, type CekLokasi, type JenisAbsen, type ModeAbsen, type WaktuAbsen } from "../../lib/absenAturan";
import type { Posisi } from "../../lib/geolocation";
import { NADA, STIKER_ABSEN, detikWIB, hariWIB, jamWIB } from "./gaya";

export interface GalatLokasi {
  pesan: string;
  izinDitolak: boolean;
}

/**
 * Tiket persiapan absen: jam berjalan + prediksi status di atas, sobekan, lalu
 * radar jarak ke kantor (dipantau terus sampai lanjut ke kamera).
 */
export default function KartuJamLokasi({
  jenis,
  mode,
  sekarang,
  waktu,
  posisi,
  cek,
  kantor,
  galat,
  onPerbarui,
}: {
  jenis: JenisAbsen;
  mode: ModeAbsen;
  sekarang: number;
  waktu: WaktuAbsen;
  posisi: Posisi | null;
  cek: CekLokasi;
  /** undefined = masih dimuat; null = gagal dimuat */
  kantor: AturanKantor | null | undefined;
  galat: GalatLokasi | null;
  onPerbarui: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm" aria-label="Waktu dan lokasi absen">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{hariWIB(sekarang)}</p>
        {waktu.chip && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${NADA[waktu.chip.nada]}`}>{waktu.chip.teks}</span>}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <img src={STIKER_ABSEN[jenis]} alt="" className="h-14 w-14 shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-[40px] font-bold leading-none tabular-nums text-brand-text">
            {jamWIB(sekarang)}
            <span className="text-lg font-semibold text-gray-300">.{detikWIB(sekarang)}</span>
          </p>
          {waktu.ket && <p className="mt-1 text-xs text-gray-500">{waktu.ket}</p>}
        </div>
      </div>

      <SobekanTiket />

      <div className="flex items-center gap-4">
        <Radar cek={cek} posisi={posisi} radius={kantor?.radius ?? 100} mode={mode} />
        <div className="min-w-0 flex-1" aria-live="polite">
          <InfoLokasi mode={mode} posisi={posisi} cek={cek} kantor={kantor} galat={galat} onPerbarui={onPerbarui} />
        </div>
      </div>
    </section>
  );
}

function InfoLokasi({
  mode,
  posisi,
  cek,
  kantor,
  galat,
  onPerbarui,
}: {
  mode: ModeAbsen;
  posisi: Posisi | null;
  cek: CekLokasi;
  kantor: AturanKantor | null | undefined;
  galat: GalatLokasi | null;
  onPerbarui: () => void;
}) {
  if (galat && (!posisi || galat.izinDitolak)) {
    return (
      <>
        <p className="flex items-center gap-1.5 font-bold text-brand-pulang">
          <MapPinOff size={16} aria-hidden="true" /> Lokasi belum didapat
        </p>
        <p className="mt-0.5 text-xs text-gray-500">{galat.pesan}</p>
        <TombolPerbarui onKlik={onPerbarui} teks="Coba lagi" />
      </>
    );
  }
  if (!posisi) {
    return (
      <>
        <p className="flex items-center gap-1.5 font-bold text-brand-text">
          <Loader2 size={16} className="animate-spin text-brand-masuk" aria-hidden="true" /> Mencari lokasi…
        </p>
        <p className="mt-0.5 text-xs text-gray-500">Pastikan GPS menyala & izin lokasi diberikan.</p>
      </>
    );
  }

  const akurasi = Math.round(posisi.akurasi);
  const barisAkurasi = (
    <p className={`mt-1 text-[11px] ${cek.akurasiOk === false ? "font-semibold text-amber-700" : "text-gray-400"}`}>
      Akurasi ±{akurasi} m{cek.akurasiOk === false ? " — tunggu sinyal membaik" : ""}
    </p>
  );

  if (cek.jarak === null) {
    return (
      <>
        <p className="font-bold text-brand-text">Lokasi didapat</p>
        {kantor && !cek.kantorAda && mode === "kantor" && <p className="mt-0.5 text-xs font-semibold text-amber-700">Titik kantor belum diatur admin.</p>}
        {barisAkurasi}
        <TombolPerbarui onKlik={onPerbarui} />
      </>
    );
  }

  return (
    <>
      <p className="text-xl font-bold leading-tight text-brand-text">
        {formatJarak(cek.jarak)} <span className="text-sm font-medium text-gray-500">dari kantor</span>
      </p>
      {mode === "luar" ? (
        <p className="mt-0.5 text-xs text-gray-500">Dinas luar — lokasimu tetap dicatat.</p>
      ) : cek.dalamRadius ? (
        <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-green-700">
          <Check size={14} aria-hidden="true" /> Dalam radius {kantor?.radius} m
        </p>
      ) : (
        <p className="mt-0.5 text-xs font-semibold text-brand-pulang">Di luar radius {kantor?.radius} m</p>
      )}
      {barisAkurasi}
      <div className="mt-1.5 flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <i className="inline-block h-2 w-2 rounded-[2px] bg-brand-masuk" /> Kantor
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <i className="inline-block h-2 w-2 rounded-full bg-brand-info" /> Kamu
        </span>
        <TombolPerbarui onKlik={onPerbarui} />
      </div>
    </>
  );
}

function TombolPerbarui({ onKlik, teks = "Perbarui" }: { onKlik: () => void; teks?: string }) {
  return (
    <button
      type="button"
      onClick={onKlik}
      className="ml-auto mt-1 flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition active:scale-95"
    >
      <RefreshCw size={12} aria-hidden="true" /> {teks}
    </button>
  );
}

/** Radar sederhana: kotak maroon = kantor di tengah, garis putus = radius, titik biru = kamu (utara ke atas). */
function Radar({ cek, posisi, radius, mode }: { cek: CekLokasi; posisi: Posisi | null; radius: number; mode: ModeAbsen }) {
  const R = 30;
  const ada = !!posisi && cek.jarak !== null;
  const t = ada ? titikRadar(cek, radius, R, 42) : null;
  const rAkurasi = posisi ? Math.min(40, Math.max(7, (posisi.akurasi * R) / Math.max(1, radius))) : 0;
  const hijau = mode === "kantor" && cek.dalamRadius === true;
  const label = !ada
    ? "Radar lokasi: menunggu posisi"
    : `Radar lokasi: kamu ${formatJarak(cek.jarak!)} dari kantor, ${cek.dalamRadius ? "di dalam" : "di luar"} radius ${radius} meter`;
  return (
    <svg viewBox="-50 -50 100 100" className="h-24 w-24 shrink-0" role="img" aria-label={label}>
      <circle r="49" fill="var(--color-brand-bg)" />
      <line x1="-49" x2="49" y1="0" y2="0" stroke="#e5e7eb" strokeWidth="0.75" />
      <line x1="0" x2="0" y1="-49" y2="49" stroke="#e5e7eb" strokeWidth="0.75" />
      <circle
        r={R}
        fill={hijau ? "rgba(22,163,74,0.10)" : "rgba(142,30,60,0.05)"}
        stroke={hijau ? "#16a34a" : "#8e1e3c"}
        strokeOpacity="0.55"
        strokeDasharray="3 3"
        style={{ transition: "fill .4s, stroke .4s" }}
      />
      <text y="-40" textAnchor="middle" fontSize="7" fontWeight="700" fill="#9ca3af">
        U
      </text>
      <rect x="-5" y="-5" width="10" height="10" rx="2.5" fill="#8e1e3c" stroke="#fff" strokeWidth="1.5" />
      {t && (
        <g style={{ transform: `translate(${t.x}px, ${t.y}px)`, transition: "transform .6s ease" }}>
          <circle r={rAkurasi} fill="rgba(37,99,235,0.14)" />
          <circle r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
