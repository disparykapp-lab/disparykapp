import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Foto from "./Foto";
import SectionHeading from "./SectionHeading";
import type { IsiTestimoni, ItemTestimoni } from "./types";
import { gsap, prefersReducedMotion, useTilt } from "./efek";

const JEDA_AUTOPLAY_MS = 4500;

/**
 * Carousel testimoni: tombol panah, geser dengan mouse/sentuh, snap, autoplay pelan.
 * Autoplay berhenti saat kursor di atas, fokus di dalam, atau tab tidak terlihat.
 */
export default function Testimoni({ isi }: { isi: IsiTestimoni }) {
  const scope = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [diAwal, setDiAwal] = useState(true);
  const [diAkhir, setDiAkhir] = useState(false);
  const [dijeda, setDijeda] = useState(false);
  const seret = useRef<{ x: number; kiri: number } | null>(null);

  const perbarui = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setDiAwal(el.scrollLeft <= 4);
    setDiAkhir(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    perbarui();
    window.addEventListener("resize", perbarui);
    return () => window.removeEventListener("resize", perbarui);
  }, [perbarui, isi.items.length]);

  function geser(arah: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const kartu = el.querySelector<HTMLElement>("[data-testi]");
    const langkah = (kartu?.offsetWidth ?? el.clientWidth) + 20;
    el.scrollBy({ left: arah * langkah, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  // Autoplay pelan. Berhenti saat dijeda, dan tidak jalan di reduced motion.
  useEffect(() => {
    if (dijeda || prefersReducedMotion() || isi.items.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const el = track.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        geser(1);
      }
    }, JEDA_AUTOPLAY_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dijeda, isi.items.length]);

  // Geser dengan mouse (sentuh sudah ditangani scroll native).
  function mulaiSeret(e: ReactPointerEvent<HTMLUListElement>) {
    if (e.pointerType !== "mouse" || !track.current) return;
    seret.current = { x: e.clientX, kiri: track.current.scrollLeft };
    track.current.style.scrollSnapType = "none";
  }
  function saatSeret(e: ReactPointerEvent<HTMLUListElement>) {
    const s = seret.current;
    if (!s || !track.current) return;
    track.current.scrollLeft = s.kiri - (e.clientX - s.x);
  }
  function selesaiSeret() {
    if (!seret.current || !track.current) return;
    seret.current = null;
    track.current.style.scrollSnapType = "";
    perbarui();
  }

  useEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-testi]"),
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [isi.items.length]);

  if (isi.items.length === 0) return null;

  return (
    <section
      ref={scope}
      id="testimoni"
      aria-labelledby="judul-testimoni"
      className="scroll-mt-20 py-20 md:py-24"
      onMouseEnter={() => setDijeda(true)}
      onMouseLeave={() => setDijeda(false)}
      onFocus={() => setDijeda(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDijeda(false);
      }}
    >
      <div className="container-lnd">
        <SectionHeading
          id="judul-testimoni"
          judul={isi.judul}
          subjudul={isi.subjudul}
          aksi={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => geser(-1)}
                disabled={diAwal}
                aria-label="Testimoni sebelumnya"
                className="tombol-bulat disabled:opacity-40"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => geser(1)}
                disabled={diAkhir}
                aria-label="Testimoni berikutnya"
                className="tombol-bulat disabled:opacity-40"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          }
        />

        <ul
          ref={track}
          onScroll={perbarui}
          onPointerDown={mulaiSeret}
          onPointerMove={saatSeret}
          onPointerUp={selesaiSeret}
          onPointerLeave={selesaiSeret}
          className="tanpa-scrollbar mt-10 -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 select-none md:mx-0 md:px-0"
        >
          {isi.items.map((t) => (
            <KartuTestimoni key={t.id} item={t} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function KartuTestimoni({ item }: { item: ItemTestimoni }) {
  const kartu = useRef<HTMLElement>(null);
  useTilt(kartu, { maks: 5, angkat: false });

  return (
    <li data-testi className="min-w-[85%] snap-start list-none md:min-w-[calc((100%-40px)/3)]">
      <div style={{ perspective: 900 }} className="h-full">
        <article ref={kartu} className="kartu-3d relative h-full overflow-hidden rounded-lnd bg-white p-6 shadow-lnd">
          <div className="lapis-depan flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
              {item.foto ? (
                <Foto src={item.foto} alt={`Foto ${item.nama}`} gradien="linear-gradient(160deg,#f2b8c4,#8e1e3c)" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-lnd-merah to-lnd-merah-dark font-lnd-serif text-xl font-bold text-white" aria-hidden="true">
                  {item.nama.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-lnd-navy">{item.nama}</p>
              <p className="text-[13px] text-lnd-muted">Berkunjung ke {item.asal}</p>
            </div>
          </div>
          <blockquote className="lapis-teks mt-4 text-[15px] italic leading-relaxed text-lnd-ink">“{item.kutipan}”</blockquote>
          <div className="kilau" aria-hidden="true" />
        </article>
      </div>
    </li>
  );
}
