import { useEffect, useRef, useState } from "react";
import { sisaDetik } from "./logika";

/** Sisa detik fase sekarang menurut jam server, diperbarui 4x per detik. */
export function useSisaDetik(faseBerakhir: string | null, sekarang: () => number): number {
  const [, setTik] = useState(0);
  useEffect(() => {
    if (!faseBerakhir) return;
    const iv = window.setInterval(() => setTik((t) => t + 1), 250);
    return () => window.clearInterval(iv);
  }, [faseBerakhir]);
  return sisaDetik(faseBerakhir, sekarang());
}

/**
 * Memanggil `saatBaru` untuk tiap item (petunjuk, chat) yang datang setelah layar
 * tampil — bukan untuk riwayat yang sudah ada saat pertama dimuat. Untuk efek suara.
 */
export function useItemBaru<T extends { id: number }>(daftar: T[], saatBaru: (item: T) => void) {
  const terakhir = useRef<number | null>(null);
  const cb = useRef(saatBaru);
  useEffect(() => {
    cb.current = saatBaru;
  });
  useEffect(() => {
    const maks = daftar.reduce((m, x) => Math.max(m, x.id), 0);
    if (terakhir.current === null) {
      terakhir.current = maks;
      return;
    }
    for (const x of daftar) if (x.id > terakhir.current) cb.current(x);
    terakhir.current = Math.max(terakhir.current, maks);
  }, [daftar]);
}
