import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { gsap, prefersReducedMotion } from "./efek";

/**
 * Galeri foto destinasi. Diklik membuka lightbox dengan transisi "masuk ke dalam
 * foto" — foto thumbnail mengembang jadi layar penuh, bukan modal yang cuma
 * muncul begitu saja. Di dalam lightbox, pindah foto memakai efek dorong (bukan
 * geser datar), lewat panah, tombol panah, keyboard, atau swipe.
 */
export default function GaleriDestinasi({ foto, galeri, nama }: { foto: string; galeri: string[]; nama: string }) {
  const semua = [foto, ...galeri].filter(Boolean);
  const [bukaDi, setBukaDi] = useState<number | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Cuma 1 foto (atau kosong): tidak ada yang perlu digaleri-kan.
  if (semua.length <= 1) return null;

  return (
    <section className="ga-galeri py-16 md:py-20">
      <div className="container-lnd">
        <p className="eyebrow">Galeri</p>
        <h2 className="judul-section mt-2">Lihat Lebih Dekat</h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {semua.map((src, i) => (
            <li key={i}>
              <button
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setBukaDi(i)}
                aria-label={`Perbesar foto ${i + 1} dari ${semua.length}`}
                className="group block aspect-square w-full overflow-hidden rounded-lnd shadow-lnd transition-shadow duration-300 hover:shadow-lnd-hover"
              >
                <img
                  src={src}
                  alt={`${nama} — foto ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {bukaDi !== null && (
        <Lightbox foto={semua} indeksAwal={bukaDi} elAwal={thumbRefs.current[bukaDi]} nama={nama} onTutup={() => setBukaDi(null)} />
      )}
    </section>
  );
}

function Lightbox({
  foto,
  indeksAwal,
  elAwal,
  nama,
  onTutup,
}: {
  foto: string[];
  indeksAwal: number;
  elAwal: HTMLButtonElement | null;
  nama: string;
  onTutup: () => void;
}) {
  const [indeks, setIndeks] = useState(indeksAwal);
  const overlay = useRef<HTMLDivElement>(null);
  const bingkai = useRef<HTMLDivElement>(null);
  const gambar = useRef<HTMLImageElement>(null);
  const tombolTutup = useRef<HTMLButtonElement>(null);
  const seret = useRef<number | null>(null);
  const mengunci = useRef(false);

  // Kunci scroll halaman di belakang selama lightbox terbuka.
  useEffect(() => {
    const semula = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tombolTutup.current?.focus();
    return () => {
      document.body.style.overflow = semula;
    };
  }, []);

  // Animasi buka: bingkai foto "mengembang" dari posisi thumbnail ke layar penuh.
  useLayoutEffect(() => {
    const ov = overlay.current;
    const bk = bingkai.current;
    if (!ov || !bk) return;
    if (prefersReducedMotion()) {
      gsap.set(ov, { opacity: 1 });
      return;
    }
    gsap.set(ov, { opacity: 0 });
    gsap.to(ov, { opacity: 1, duration: 0.3 });
    if (elAwal) {
      const r = elAwal.getBoundingClientRect();
      gsap.fromTo(
        bk,
        { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 16 },
        { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: 0, duration: 0.6, ease: "power3.inOut" }
      );
    } else {
      gsap.fromTo(bk, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tutup() {
    if (prefersReducedMotion()) {
      onTutup();
      return;
    }
    gsap.to(overlay.current, { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: onTutup });
  }

  function ganti(arah: 1 | -1) {
    if (mengunci.current || foto.length <= 1) return;
    const berikut = (indeks + arah + foto.length) % foto.length;
    if (prefersReducedMotion()) {
      setIndeks(berikut);
      return;
    }
    mengunci.current = true;
    const img = gambar.current;
    gsap.to(img, {
      opacity: 0,
      scale: arah > 0 ? 0.92 : 1.08,
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => {
        setIndeks(berikut);
        gsap.fromTo(
          img,
          { opacity: 0, scale: arah > 0 ? 1.08 : 0.92 },
          { opacity: 1, scale: 1, duration: 0.32, ease: "power2.out", onComplete: () => (mengunci.current = false) }
        );
      },
    });
  }

  useEffect(() => {
    function tombol(e: KeyboardEvent) {
      if (e.key === "Escape") tutup();
      else if (e.key === "ArrowRight") ganti(1);
      else if (e.key === "ArrowLeft") ganti(-1);
    }
    window.addEventListener("keydown", tombol);
    return () => window.removeEventListener("keydown", tombol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indeks]);

  function mulaiSeret(e: ReactPointerEvent) {
    seret.current = e.clientX;
  }
  function akhiriSeret(e: ReactPointerEvent) {
    if (seret.current === null) return;
    const dx = e.clientX - seret.current;
    seret.current = null;
    if (dx > 60) ganti(-1);
    else if (dx < -60) ganti(1);
  }

  return createPortal(
    <div
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Galeri foto ${nama}, foto ${indeks + 1} dari ${foto.length}`}
      className="fixed inset-0 z-[100] bg-black"
    >
      <div ref={bingkai} className="absolute overflow-hidden bg-black" style={{ left: 0, top: 0, width: "100vw", height: "100vh" }}>
        <img
          ref={gambar}
          src={foto[indeks]}
          alt={`${nama} — foto ${indeks + 1}`}
          onPointerDown={mulaiSeret}
          onPointerUp={akhiriSeret}
          className="h-full w-full touch-none select-none object-contain"
          draggable={false}
        />
      </div>

      <button
        ref={tombolTutup}
        type="button"
        onClick={tutup}
        aria-label="Tutup galeri"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25"
      >
        <X size={20} aria-hidden="true" />
      </button>

      {foto.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => ganti(-1)}
            aria-label="Foto sebelumnya"
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 md:left-5"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => ganti(1)}
            aria-label="Foto berikutnya"
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 md:right-5"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
          <p
            aria-hidden="true"
            className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-md"
          >
            {indeks + 1} / {foto.length}
          </p>
        </>
      )}
    </div>,
    document.body
  );
}
