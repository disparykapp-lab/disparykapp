import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { IkonNama } from "./ikon";
import SectionHeading from "./SectionHeading";
import type { IsiGaya } from "./types";
import { gsap, prefersReducedMotion } from "./efek";

// Gradien khusus chip gaya: semua jenuh/gelap di seluruh bagiannya (beda dari
// gradienDefault() yang punya titik putih di tengah — cocok untuk latar foto,
// tapi bikin ikon putih di atasnya jadi kurang kontras).
const GRADIEN_GAYA = [
  "linear-gradient(160deg,#f6ab6c 0%,#e8622c 100%)",
  "linear-gradient(160deg,#34c6a3 0%,#0f8f72 100%)",
  "linear-gradient(160deg,#e0524a 0%,#8e1e3c 100%)",
  "linear-gradient(160deg,#f28ba0 0%,#c0334f 100%)",
  "linear-gradient(160deg,#6fcf97 0%,#1a7a4c 100%)",
  "linear-gradient(160deg,#9b7fe6 0%,#5b3fa0 100%)",
  "linear-gradient(160deg,#ffb84d 0%,#d9731f 100%)",
  "linear-gradient(160deg,#5ec8e6 0%,#1f6e9c 100%)",
];

function gradienGaya(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIEN_GAYA[h % GRADIEN_GAYA.length];
}

/**
 * Chip gaya perjalanan, berbentuk lingkaran bergradasi (bukan kotak seragam) supaya
 * terasa lebih hidup — dapat digeser di ponsel, menumpuk di tengah di layar lebar.
 * Klik memilih satu gaya (memudarkan agenda yang tidak cocok), klik lagi untuk reset.
 */
export default function Gaya({ isi, aktif, onPilih }: { isi: IsiGaya; aktif: string | null; onPilih: (id: string | null) => void }) {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const chip = el.querySelectorAll("[data-chip]");
      gsap.fromTo(
        chip,
        { scale: 0.6, opacity: 0, rotate: (i: number) => (i % 2 === 0 ? -10 : 10) },
        {
          scale: 1,
          opacity: 1,
          rotate: 0,
          duration: 0.7,
          ease: "back.out(1.8)",
          stagger: 0.06,
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

        <ul className="tanpa-scrollbar mt-10 -mx-6 flex snap-x gap-5 overflow-x-auto px-6 pb-3 md:mx-0 md:flex-wrap md:justify-center md:gap-7 md:overflow-visible md:px-0">
          {isi.items.map((g) => {
            const terpilih = aktif === g.id;
            return (
              <li key={g.id} data-chip className="list-none">
                <button
                  type="button"
                  aria-pressed={terpilih}
                  onClick={() => onPilih(terpilih ? null : g.id)}
                  className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2.5 text-center md:w-[100px]"
                >
                  <span
                    className={`relative flex h-[74px] w-[74px] items-center justify-center rounded-full text-white shadow-lnd transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-lnd-hover md:h-[84px] md:w-[84px] ${
                      terpilih ? "ring-4 ring-lnd-merah ring-offset-2 ring-offset-lnd-sky" : ""
                    }`}
                    style={{ background: gradienGaya(g.id) }}
                  >
                    <span className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-8deg]">
                      <IkonNama nama={g.icon} size={28} />
                    </span>
                    {terpilih && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-lnd-merah text-white shadow-lnd ring-2 ring-white">
                        <Check size={13} strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className={`text-[13px] font-semibold leading-tight transition-colors ${terpilih ? "text-lnd-merah" : "text-lnd-navy"}`}>
                    {g.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
