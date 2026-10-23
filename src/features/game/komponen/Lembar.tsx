import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Pop-up bergaya game: lembar dari bawah di HP, kotak di tengah di layar lebar.
 * Esc / klik latar menutup, scroll halaman dikunci, fokus awal ke elemen bertanda
 * `data-fokus-awal` (kalau tidak ada / nonaktif, ke tombol pertama).
 */
export default function Lembar({
  judul,
  ikon,
  onTutup,
  children,
}: {
  judul: ReactNode;
  ikon?: ReactNode;
  onTutup: () => void;
  children: ReactNode;
}) {
  const idJudul = useId();
  const kotak = useRef<HTMLDivElement>(null);
  // callback terbaru di ref: render ulang induk tidak menjalankan ulang efek di bawah
  const tutup = useRef(onTutup);
  useLayoutEffect(() => {
    tutup.current = onTutup;
  });

  useEffect(() => {
    const el =
      kotak.current?.querySelector<HTMLElement>("[data-fokus-awal]:not(:disabled)") ??
      kotak.current?.querySelector<HTMLElement>("button:not(:disabled)");
    el?.focus();
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowLama;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      className="coret-tebak ct-popup-latar fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center"
      onClick={() => tutup.current()}
    >
      <div
        ref={kotak}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        className="ct-kartu ct-popup flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2 bg-[var(--ct-biru)] px-4 py-3 text-white">
          {ikon}
          <h2 id={idJudul} className="ct-judul min-w-0 flex-1 text-xl leading-tight">
            {judul}
          </h2>
          <button
            type="button"
            onClick={() => tutup.current()}
            aria-label="Tutup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
