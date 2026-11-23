import { useState } from "react";
import { Minus, Package, Plus } from "lucide-react";
import { urlFotoBarang, type Pelaku } from "../../lib/inventaris";
import { BATAS_INVENTARIS, formatAngka, statusStok } from "../../lib/inventarisAturan";
import { inisial } from "../../lib/inisial";
import { KELAS_BARIS_CHIP, kelasChip } from "./gaya";
import type { BarangInventaris } from "../../types/database";

/** Foto barang; `kecil` = versi kartu (jatuh ke foto utama kalau belum ada). Tanpa foto = ikon kardus. */
export function FotoBarang({
  path,
  kecil = false,
  alt,
  className = "",
  ukuranIkon = 32,
}: {
  path: string | null;
  kecil?: boolean;
  alt: string;
  className?: string;
  ukuranIkon?: number;
}) {
  const [pakaiUtama, setPakaiUtama] = useState(false);
  const [gagal, setGagal] = useState(false);
  const url = urlFotoBarang(path, kecil && !pakaiUtama);
  if (!url || gagal) {
    return (
      <div className={`flex items-center justify-center bg-lnd-sky text-brand-masuk/40 ${className}`} role="img" aria-label={`${alt} (belum ada foto)`}>
        <Package size={ukuranIkon} strokeWidth={1.6} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading={kecil ? "lazy" : "eager"}
      decoding="async"
      onError={() => (kecil && !pakaiUtama ? setPakaiUtama(true) : setGagal(true))}
      className={`bg-gray-100 object-cover ${className}`}
    />
  );
}

export function LencanaStok({ barang, className = "" }: { barang: Pick<BarangInventaris, "stok" | "stok_minimum">; className?: string }) {
  const s = statusStok(barang);
  if (s === "aman") return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s === "habis" ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950"} ${className}`}
    >
      {s === "habis" ? "Habis" : "Menipis"}
    </span>
  );
}

export function Avatar({ pelaku, ukuran = "h-8 w-8 text-[11px]" }: { pelaku: Pelaku; ukuran?: string }) {
  const nama = pelaku?.nama ?? "?";
  if (pelaku?.foto_url) {
    return <img src={pelaku.foto_url} alt="" className={`${ukuran} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${ukuran} flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-600`} aria-hidden="true">
      {inisial(nama)}
    </span>
  );
}

/** Penghitung jumlah: tombol −/+ besar, angka bisa diketik, chip tambah cepat. */
export function PenghitungJumlah({
  nilai,
  onUbah,
  satuan,
  maks,
  idLabel,
  cepat = [1, 5, 10, 25, 50],
}: {
  nilai: number;
  onUbah: (n: number) => void;
  satuan: string;
  /** batas atas untuk chip "Semua" (stok tersedia saat keluar) */
  maks?: number;
  idLabel: string;
  cepat?: number[];
}) {
  const batasi = (n: number) => Math.max(0, Math.min(BATAS_INVENTARIS.jumlah, Math.round(n)));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUbah(batasi(nilai - 1))}
          disabled={nilai <= 0}
          aria-label="Kurangi satu"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-300 bg-white text-brand-text transition active:scale-95 disabled:opacity-40"
        >
          <Minus size={22} />
        </button>
        <label className="flex h-14 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-brand-masuk/40">
          <input
            aria-labelledby={idLabel}
            inputMode="numeric"
            value={nilai === 0 ? "" : String(nilai)}
            placeholder="0"
            onChange={(e) => onUbah(batasi(Number(e.target.value.replace(/\D/g, "")) || 0))}
            onFocus={(e) => e.target.select()}
            className="w-full min-w-0 bg-transparent text-center text-3xl font-extrabold leading-none tabular-nums text-brand-text outline-none placeholder:text-gray-300"
          />
          <span className="shrink-0 pt-1.5 text-sm font-semibold text-gray-400">{satuan}</span>
        </label>
        <button
          type="button"
          onClick={() => onUbah(batasi(nilai + 1))}
          aria-label="Tambah satu"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-masuk text-white shadow-sm transition active:scale-95"
        >
          <Plus size={22} />
        </button>
      </div>
      <div className={KELAS_BARIS_CHIP} role="group" aria-label="Tambah cepat">
        {cepat.map((n) => (
          <button key={n} type="button" onClick={() => onUbah(batasi(nilai + n))} className={kelasChip(false)}>
            +{n}
          </button>
        ))}
        {maks !== undefined && maks > 0 && (
          <button type="button" onClick={() => onUbah(maks)} className={kelasChip(nilai === maks)}>
            Semua ({formatAngka(maks)})
          </button>
        )}
        {nilai > 0 && (
          <button type="button" onClick={() => onUbah(0)} className="min-h-[36px] shrink-0 px-2 text-xs font-semibold text-gray-400">
            Kosongkan
          </button>
        )}
      </div>
    </div>
  );
}

