import { useEffect, useRef } from "react";

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
