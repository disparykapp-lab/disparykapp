import { useEffect, useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Newspaper } from "lucide-react";
import BagianKosong from "./BagianKosong";
import Foto from "./Foto";
import SectionHeading from "./SectionHeading";
import type { IsiBerita, ItemBerita } from "./types";
import { gsap, prefersReducedMotion } from "./efek";
import { bukaDenganTransisi, gradienDefault } from "./transisi";

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Berita terkini dari admin. Tiap kartu masuk dengan fade naik, klik membuka halaman detail. */
export default function Berita({ isi, adaNewsletter }: { isi: IsiBerita; adaNewsletter: boolean }) {
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

        {isi.items.length === 0 && (
          <BagianKosong ikon={<Newspaper size={28} aria-hidden="true" />} judul={isi.kosongJudul} teks={isi.kosongTeks} ajakNewsletter={adaNewsletter} />
        )}

        <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isi.items.map((b) => (
            <KartuBerita key={b.id} item={b} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function KartuBerita({ item }: { item: ItemBerita }) {
  const fotoEl = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  function buka(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("a")) return;
    bukaDenganTransisi(
      fotoEl.current,
      { foto: item.foto, gradien: gradienDefault(item.id), nama: item.judul, wilayah: formatTanggal(item.tanggal) },
      () => navigate(`/berita/${item.id}`)
    );
  }

  return (
    <li key={item.id} data-berita className="min-w-0 list-none">
      <article
        onClick={buka}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-lnd bg-white shadow-lnd transition-shadow duration-300 hover:shadow-lnd-hover"
      >
        <div ref={fotoEl} className="relative aspect-[16/10] overflow-hidden">
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.05]">
            <Foto src={item.foto} alt={item.judul} gradien="linear-gradient(160deg,#f2b8c4 0%,#8e1e3c 100%)" />
          </div>
        </div>
        <div className="relative flex flex-1 flex-col p-5 pb-6">
          <p className="label-kecil">{formatTanggal(item.tanggal)}</p>
          <h3 className="mt-2 line-clamp-2 break-words font-lnd-serif text-[20px] font-bold leading-snug text-lnd-navy">{item.judul}</h3>
          <p className="mt-2 line-clamp-3 min-h-[3.9em] break-words pr-10 text-[14px] text-lnd-muted">{item.ringkasan}</p>
          <span
            aria-hidden="true"
            className="absolute bottom-5 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-lnd-line bg-white text-lnd-navy transition-colors group-hover:border-lnd-merah group-hover:bg-lnd-merah group-hover:text-white"
          >
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-500 group-hover:-rotate-45" />
          </span>
        </div>
      </article>
    </li>
  );
}
