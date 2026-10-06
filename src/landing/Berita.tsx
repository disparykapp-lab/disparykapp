import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import Foto from "./Foto";
import SectionHeading from "./SectionHeading";
import type { IsiBerita } from "./types";
import { gsap, prefersReducedMotion } from "./efek";

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Berita terkini dari admin. Tiap kartu masuk dengan fade naik. */
export default function Berita({ isi }: { isi: IsiBerita }) {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-berita]"),
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
  }, []);

  return (
    <section ref={scope} id="berita" aria-labelledby="judul-berita" className="scroll-mt-20 py-20 md:py-24">
      <div className="container-lnd">
        <SectionHeading id="judul-berita" judul={isi.judul} subjudul={isi.subjudul} />

        <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isi.items.map((b) => (
            <li key={b.id} data-berita className="list-none">
              <article className="group flex h-full flex-col overflow-hidden rounded-lnd bg-white shadow-lnd transition-shadow duration-300 hover:shadow-lnd-hover">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.05]">
                    <Foto src={b.foto} alt={b.judul} gradien="linear-gradient(160deg,#f2b8c4 0%,#8e1e3c 100%)" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="label-kecil">{formatTanggal(b.tanggal)}</p>
                  <h3 className="mt-2 font-lnd-serif text-[20px] font-bold leading-snug text-lnd-navy">{b.judul}</h3>
                  <p className="mt-2 text-[14px] text-lnd-muted">{b.ringkasan}</p>
                  {b.tautan && (
                    <a
                      href={b.tautan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-lnd mt-auto pt-4"
                    >
                      Baca selengkapnya <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
