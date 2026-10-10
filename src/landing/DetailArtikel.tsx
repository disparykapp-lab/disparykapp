import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Foto from "./Foto";
import { gsap, keAtasLangsung, prefersReducedMotion } from "./efek";
import { bukaDenganTransisi, gradienDefault, tutupTransisi } from "./transisi";

export interface ItemLainArtikel {
  id: string;
  judul: string;
  sub: string;
  foto: string;
}

interface Props {
  id: string;
  eyebrow: string;
  judul: string;
  foto: string;
  infoBaris: { ikon: ReactNode; teks: string }[];
  paragraf: string[];
  sumberLabel?: string;
  sumberUrl?: string;
  logo: string;
  /** id section di landing yang dituju saat tombol "Kembali" ditekan, mis. "berita" atau "agenda" */
  kembaliGulir: string;
  lainnyaJudul: string;
  /** awalan alamat detail lain, mis. "/berita" atau "/agenda" (tanpa garis miring di akhir) */
  lainnyaPath: string;
  lainnya: ItemLainArtikel[];
}

/**
 * Templat halaman detail artikel (dipakai berita & agenda): foto sampul,
 * judul, info singkat, isi, tautan sumber (opsional), dan daftar lainnya.
 * Lebih sederhana dari halaman detail destinasi (tanpa animasi huruf per huruf).
 */
export default function DetailArtikel({
  id,
  eyebrow,
  judul,
  foto,
  infoBaris,
  paragraf,
  sumberLabel,
  sumberUrl,
  logo,
  kembaliGulir,
  lainnyaJudul,
  lainnyaPath,
  lainnya,
}: Props) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const gradien = gradienDefault(id);

  // Mulai dari atas, lalu lapisan transisi dari kartu memudar memperlihatkan hero.
  useLayoutEffect(() => {
    keAtasLangsung();
    tutupTransisi();
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });
      tl.fromTo(".da-foto", { scale: 1.15 }, { scale: 1.02, duration: 1.8, ease: "power2.out" }, 0)
        .fromTo(".da-atas", { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.1)
        .fromTo(".da-eyebrow", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.25)
        .fromTo(".da-judul", { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.3)
        .fromTo(".da-info", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 }, 0.55);
      gsap.fromTo(
        ".da-paragraf",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, scrollTrigger: { trigger: ".da-isi", start: "top 85%", once: true } }
      );
      gsap.fromTo(
        ".da-lain",
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, stagger: 0.08, scrollTrigger: { trigger: ".da-lainnya", start: "top 85%", once: true } }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  function kembali() {
    navigate("/", { state: { gulir: kembaliGulir } });
  }

  function bukaLain(l: ItemLainArtikel, sumber: HTMLElement | null) {
    bukaDenganTransisi(sumber, { foto: l.foto, gradien: gradienDefault(l.id), nama: l.judul, wilayah: l.sub }, () =>
      navigate(`${lainnyaPath}/${l.id}`)
    );
  }

  return (
    <div ref={root}>
      <section aria-labelledby="judul-artikel" className="relative h-[46vh] min-h-[340px] overflow-hidden bg-lnd-navy md:h-[52vh]">
        <div className="da-foto absolute inset-0">
          <Foto src={foto} alt="" gradien={gradien} lazy={false} prioritas />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,27,58,0.4)_0%,rgba(11,27,58,0.12)_35%,rgba(11,27,58,0.88)_100%)]"
        />

        <div className="da-atas container-lnd absolute inset-x-0 top-0 z-10 flex items-center justify-between pt-6">
          <button
            type="button"
            onClick={kembali}
            className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-[14px] font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Kembali
          </button>
          <span className="font-lnd-serif text-[20px] font-bold text-white">{logo}</span>
        </div>

        <div className="container-lnd absolute inset-x-0 bottom-0 z-10 pb-8 text-white md:pb-10">
          <p className="da-eyebrow eyebrow text-white/85">{eyebrow}</p>
          <h1 id="judul-artikel" className="da-judul mt-2 max-w-3xl break-words font-lnd-serif text-[32px] font-bold leading-[1.1] md:text-[44px]">
            {judul}
          </h1>
          {infoBaris.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {infoBaris.map((b, i) => (
                <li key={i} className="da-info flex items-center gap-1.5 text-[13px] font-medium text-white/90">
                  {b.ikon}
                  {b.teks}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="da-isi py-16 md:py-20">
        <div className="container-lnd">
          <div className="mx-auto max-w-[700px]">
            {paragraf.map((p, i) => (
              <p key={i} className="da-paragraf mb-5 break-words text-[16px] leading-[1.8] text-lnd-ink last:mb-0">
                {p}
              </p>
            ))}
            {sumberUrl && (
              <a href={sumberUrl} target="_blank" rel="noopener noreferrer" className="link-lnd mt-6 inline-flex">
                {sumberLabel ?? "Baca sumber asli"} <ExternalLink size={15} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </section>

      {lainnya.length > 0 && (
        <section className="da-lainnya bg-lnd-sky py-16 md:py-20">
          <div className="container-lnd">
            <h2 className="judul-section">{lainnyaJudul}</h2>
            <ul className="tanpa-scrollbar -mx-6 mt-8 flex snap-x gap-4 overflow-x-auto px-6 pb-4 md:mx-0 md:px-0">
              {lainnya.map((l) => (
                <KartuLain key={l.id} item={l} onBuka={bukaLain} />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function KartuLain({ item, onBuka }: { item: ItemLainArtikel; onBuka: (l: ItemLainArtikel, sumber: HTMLElement | null) => void }) {
  const foto = useRef<HTMLDivElement>(null);
  return (
    <li className="da-lain w-[220px] shrink-0 snap-start md:w-[260px]">
      <button type="button" onClick={() => onBuka(item, foto.current)} className="group block w-full text-left">
        <div ref={foto} className="relative aspect-[4/3] overflow-hidden rounded-lnd shadow-lnd">
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
            <Foto src={item.foto} alt="" gradien={gradienDefault(item.id)} />
          </div>
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(11,27,58,0.9)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{item.sub}</p>
            <p className="mt-1 line-clamp-2 break-words font-lnd-serif text-[16px] font-bold leading-tight">{item.judul}</p>
          </div>
        </div>
      </button>
    </li>
  );
}
