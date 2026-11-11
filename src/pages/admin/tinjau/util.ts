import { useEffect, useRef } from "react";
import type { Kategori } from "../../../lib/tinjauAbsenAturan";

/** Kunci gulir halaman + tutup dengan Escape selama modal terbuka. */
export function useModal(onTutup: () => void, onTombol?: (e: KeyboardEvent) => void) {
  const tutup = useRef(onTutup);
  const tombol = useRef(onTombol);
  useEffect(() => {
    tutup.current = onTutup;
    tombol.current = onTombol;
  });
  useEffect(() => {
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup.current();
      else tombol.current?.(e);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowLama;
      document.removeEventListener("keydown", onKey);
    };
  }, []);
}

/** Garis + bayangan kartu sesuai kehadiran: hadir tanpa garis, telat kuning, izin merah, belum absen hitam. */
export const GAYA_KATEGORI: Record<Kategori, { kartu: string; chip: string; label: string }> = {
  hadir: { kartu: "shadow-sm ring-1 ring-black/5", chip: "", label: "Hadir" },
  telat: { kartu: "shadow-md shadow-amber-200/70 ring-2 ring-amber-400", chip: "bg-amber-100 text-amber-800", label: "Telat" },
  izin: { kartu: "shadow-md shadow-red-200/70 ring-2 ring-red-500", chip: "bg-red-100 text-red-700", label: "Izin/Sakit" },
  belum: { kartu: "shadow-md shadow-gray-400/50 ring-2 ring-gray-900", chip: "bg-gray-900 text-white", label: "Belum absen" },
};

export const jam = (at: string, detik = false) =>
  new Date(at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: detik ? "2-digit" : undefined, timeZone: "Asia/Jakarta" });

/** Inisial nama untuk avatar tanpa foto. */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  return ((kata[0]?.[0] ?? "?") + (kata.length > 1 ? kata[kata.length - 1][0] : "")).toUpperCase();
}
