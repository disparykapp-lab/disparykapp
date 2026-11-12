import type { JenisHari } from "../../lib/rekapSayaAturan";

/** Warna per jenis hari — sama dengan Tinjau Absensi (kuning telat, merah izin, hitam tidak absen). */
export const GAYA_HARI: Record<JenisHari, { sel: string; kartu: string; chip: string; label: string }> = {
  hadir: { sel: "bg-green-100 font-semibold text-green-800", kartu: "shadow-sm ring-1 ring-black/5", chip: "bg-green-100 text-green-700", label: "Tepat waktu" },
  dinas: { sel: "bg-sky-100 font-semibold text-sky-800", kartu: "shadow-sm ring-1 ring-black/5", chip: "bg-sky-100 text-sky-700", label: "Dinas Luar" },
  telat: { sel: "bg-amber-50 font-semibold text-amber-900 ring-2 ring-amber-400", kartu: "shadow-md shadow-amber-200/70 ring-2 ring-amber-400", chip: "bg-amber-100 text-amber-800", label: "Telat" },
  izin: { sel: "bg-red-50 font-semibold text-red-700 ring-2 ring-red-500", kartu: "shadow-md shadow-red-200/70 ring-2 ring-red-500", chip: "bg-red-100 text-red-700", label: "Izin/Sakit" },
  tidak: { sel: "font-semibold text-gray-900 ring-2 ring-gray-900", kartu: "shadow-md shadow-gray-400/50 ring-2 ring-gray-900", chip: "bg-gray-900 text-white", label: "Tidak absen" },
  belum: { sel: "font-bold text-brand-text ring-1 ring-brand-masuk/60", kartu: "", chip: "bg-gray-100 text-gray-600", label: "Belum absen" },
  libur: { sel: "text-gray-300", kartu: "", chip: "", label: "Libur" },
  kosong: { sel: "text-gray-400", kartu: "", chip: "", label: "" },
  nanti: { sel: "text-gray-400", kartu: "", chip: "", label: "" },
};

export const jamWIB = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
