import { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Route } from "lucide-react";
import BagianKosong from "./BagianKosong";
import Foto from "./Foto";
import SectionHeading from "./SectionHeading";
import type { IsiPaket, ItemPaket } from "./types";
import { gsap, prefersReducedMotion, useTilt } from "./efek";
import { bukaDenganTransisi, gradienDefault } from "./transisi";

/**
 * Agenda unggulan. Mobile: carousel snap satu kartu. Tablet/desktop: grid.
 * Gaya yang dipilih di chip membuat kartu yang tidak cocok meredup.
 */
export default function Paket({
  isi,
  gayaAktif,
  onInfo,
  adaNewsletter,
}: {
  isi: IsiPaket;
  gayaAktif: string | null;
  onInfo: (p: string) => void;
  adaNewsletter: boolean;
}) {
  const grid = useRef<HTMLUListElement>(null);

  // Kartu masuk dari samping bergantian: x ±60 → 0, rotateY ±12° → 0.
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      Array.from(el.querySelectorAll<HTMLElement>("[data-paket]")).forEach((k, i) => {
        const arah = i % 2 === 0 ? -1 : 1;
        gsap.fromTo(
          k,
          { x: arah * 60, rotateY: arah * 12, opacity: 0 },
          {
            x: 0,
            rotateY: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }
        );
      });
    }, el);
    return () => ctx.revert();
  }, []);

  // Redupkan kartu yang gayanya tidak cocok dengan chip yang dipilih.
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>("[data-paket]").forEach((k) => {
      const cocok = !gayaAktif || (k.dataset.gaya ?? "").split(",").includes(gayaAktif);
      if (prefersReducedMotion()) {
        k.style.opacity = cocok ? "1" : "0.35";
        return;
      }
      gsap.to(k, { opacity: cocok ? 1 : 0.35, scale: cocok ? 1 : 0.98, duration: 0.4, ease: "power2.out" });
    });
  }, [gayaAktif]);

  return (
    <section id="agenda" aria-labelledby="judul-agenda" className="scroll-mt-20 py-20 md:py-24">
      <div className="container-lnd">
        <SectionHeading
          id="judul-agenda"
          judul={isi.judul}
          subjudul={isi.subjudul}
          aksi={
            isi.items.length > 0 && (
              <button type="button" onClick={() => onInfo("Segera hadir")} className="link-lnd">
                {isi.tautanLabel}
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            )
          }
        />

        {isi.items.length === 0 && (
          <BagianKosong ikon={<CalendarDays size={28} aria-hidden="true" />} judul={isi.kosongJudul} teks={isi.kosongTeks} ajakNewsletter={adaNewsletter} />
        )}

        <ul
          ref={grid}
          className="tanpa-scrollbar mt-10 -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3"
        >
          {isi.items.map((p) => (
            <KartuPaket key={p.id} item={p} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function KartuPaket({ item }: { item: ItemPaket }) {
  const kartu = useRef<HTMLElement>(null);
  const fotoEl = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useTilt(kartu, { maks: 12 });

  function buka() {
    bukaDenganTransisi(
      fotoEl.current,
      { foto: item.foto, gradien: gradienDefault(item.id), nama: item.judul, wilayah: item.negara },
      () => navigate(`/agenda/${item.id}`)
    );
  }

  return (
    <li data-paket data-gaya={item.gaya.join(",")} className="group min-w-[85%] snap-center list-none md:min-w-0">
      <div style={{ perspective: 900 }}>
        <article
          ref={kartu}
          onClick={buka}
          className="kartu-3d relative cursor-pointer overflow-hidden rounded-lnd bg-white shadow-lnd transition-shadow duration-300 hover:shadow-lnd-hover"
        >
          <div ref={fotoEl} className="relative aspect-[3/2] overflow-hidden">
            <div className="lapis-depan absolute inset-0 transition-transform duration-500 group-hover:scale-[1.08]">
              <Foto src={item.foto} alt={item.judul} gradien="linear-gradient(160deg,#7fe0e6 0%,#1fb6c4 50%,#2d6b5a 100%)" />
            </div>
            <span className="absolute bottom-3 left-3 z-10 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-lnd-navy shadow-lnd">
              {item.durasi} Hari
            </span>
          </div>
          <div className="lapis-teks relative p-5 pb-6">
            <h3 className="line-clamp-2 break-words pr-10 font-lnd-serif text-[20px] font-bold leading-snug text-lnd-navy">{item.judul}</h3>
            <p className="mt-2 line-clamp-2 break-words text-[14px] text-lnd-muted">{item.deskripsi}</p>
            {/* pr-10: menyisakan ruang di kanan supaya teks (terutama harga) tidak tertutup tombol panah bulat */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-lnd-line pr-10 pt-3 text-[13px] text-lnd-ink">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" className="shrink-0 text-lnd-merah" /> {item.negara}
              </span>
              <span className="flex items-center gap-1.5">
                <Route size={14} aria-hidden="true" className="shrink-0 text-lnd-merah" /> {item.durasi} hari
              </span>
              <span className="break-words font-semibold text-lnd-navy">{item.harga}</span>
            </div>
            <span
              aria-hidden="true"
              className="absolute bottom-5 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-lnd-line bg-white text-lnd-navy transition-colors group-hover:border-lnd-merah group-hover:bg-lnd-merah group-hover:text-white"
            >
              <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-500 group-hover:-rotate-45" />
            </span>
          </div>
          <div className="kilau" aria-hidden="true" />
        </article>
      </div>
    </li>
  );
}
