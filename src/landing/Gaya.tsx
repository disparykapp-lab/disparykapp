import { useEffect, useRef } from "react";
import { IkonNama } from "./ikon";
import SectionHeading from "./SectionHeading";
import type { IsiGaya } from "./types";
import { gsap, prefersReducedMotion } from "./efek";

/** Chip gaya perjalanan. Klik memilih satu gaya (memudarkan paket yang tidak cocok), klik lagi untuk reset. */
export default function Gaya({ isi, aktif, onPilih }: { isi: IsiGaya; aktif: string | null; onPilih: (id: string | null) => void }) {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-chip]"),
        { scale: 0.85, y: 30, opacity: 0 },
        {
          scale: 1,
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "back.out(1.6)",
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={scope} id="gaya" aria-labelledby="judul-gaya" className="scroll-mt-20 bg-lnd-sky py-20 md:py-24">
      <div className="container-lnd">
        <SectionHeading id="judul-gaya" judul={isi.judul} subjudul={isi.subjudul} />

        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 xl:grid-cols-8">
          {isi.items.map((g) => {
            const terpilih = aktif === g.id;
            return (
              <li key={g.id} data-chip className="list-none">
                <button
                  type="button"
                  aria-pressed={terpilih}
                  onClick={() => onPilih(terpilih ? null : g.id)}
                  className={`group flex min-h-[96px] w-full flex-col items-center justify-center gap-2.5 rounded-lnd border-2 bg-white px-3 py-4 text-center shadow-lnd transition-all duration-300 hover:-translate-y-1 ${
                    terpilih ? "border-lnd-merah bg-lnd-sky-100" : "border-transparent"
                  }`}
                >
                  <span className="text-lnd-merah transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <IkonNama nama={g.icon} size={26} />
                  </span>
                  <span className="text-[13px] font-semibold leading-tight text-lnd-navy">{g.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
