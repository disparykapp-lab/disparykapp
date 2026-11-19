// Kelas & gaya bersama halaman Inventaris (bukan komponen, supaya fast refresh tetap jalan).
import { ArrowDownToLine, ArrowUpFromLine, PackagePlus, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { NadaLog } from "../../lib/inventarisAturan";
import type { JenisMutasi } from "../../types/database";

export const kelasChip = (aktif: boolean) =>
  `min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${
    aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-brand-text"
  }`;

/** Baris chip yang bisa digeser ke samping (memudar di ujung kanan). */
export const KELAS_BARIS_CHIP =
  "-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]";

/** Masuk = hijau, keluar = maroon. */
export const GAYA_JENIS: Record<JenisMutasi, { label: string; ikon: typeof ArrowDownToLine; teks: string; latar: string; tombol: string }> = {
  masuk: { label: "Masuk", ikon: ArrowDownToLine, teks: "text-emerald-700", latar: "bg-emerald-50", tombol: "bg-emerald-600" },
  keluar: { label: "Keluar", ikon: ArrowUpFromLine, teks: "text-brand-masuk", latar: "bg-lnd-sky", tombol: "bg-brand-masuk" },
};

/** Ikon & warna tiap jenis aksi di log. */
export const GAYA_NADA: Record<NadaLog, { ikon: typeof ArrowDownToLine; teks: string; latar: string; judul: string }> = {
  masuk: { ikon: ArrowDownToLine, teks: "text-emerald-700", latar: "bg-emerald-50", judul: "Barang masuk" },
  keluar: { ikon: ArrowUpFromLine, teks: "text-brand-masuk", latar: "bg-lnd-sky", judul: "Barang keluar" },
  tambah: { ikon: PackagePlus, teks: "text-blue-700", latar: "bg-blue-50", judul: "Barang baru" },
  ubah: { ikon: Pencil, teks: "text-amber-700", latar: "bg-amber-50", judul: "Perubahan" },
  hapus: { ikon: Trash2, teks: "text-red-600", latar: "bg-red-50", judul: "Dihapus" },
  pulihkan: { ikon: RotateCcw, teks: "text-emerald-700", latar: "bg-emerald-50", judul: "Dipulihkan" },
};
