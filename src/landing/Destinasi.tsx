import { useEffect, useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Foto from "./Foto";
import HeartButton from "./HeartButton";
import SectionHeading from "./SectionHeading";
import type { IsiDestinasi, ItemDestinasi } from "./types";
import { gsap, Flip, prefersReducedMotion, useTilt } from "./efek";
import { bukaDenganTransisi, gradienDefault } from "./transisi";

interface Props {
  isi: IsiDestinasi;
  kategoriAktif: string | null;
  sorotId: string | null;
  wishlist: Set<string>;
  onWishlist: (id: string) => boolean;
  onInfo: (pesan: string) => void;
}

function cocok(tags: string[], kategori: string | null): boolean {
  return !kategori || tags.includes(kategori);
}

export default function Destinasi({ isi, kategoriAktif, sorotId, wishlist, onWishlist, onInfo }: Props) {
  const scope = useRef<HTMLElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  // Pembanding nilai sebelumnya: efek filter hanya jalan saat kategori benar-benar berganti
  // (bukan saat mount, termasuk saat StrictMode menjalankan efek dua kali).
  const sebelumnya = useRef(kategoriAktif);

  // Filter kategori: kartu yang tidak cocok memudar, lalu kartu lain bergeser dengan GSAP Flip.
  useEffect(() => {
    if (sebelumnya.current === kategoriAktif) return;
    sebelumnya.current = kategoriAktif;
    const el = grid.current;
    if (!el) return;
    const kartu = Array.from(el.querySelectorAll<HTMLElement>("[data-kartu]"));
    const cocokKe = (k: HTMLElement) => cocok((k.dataset.tags ?? "").split(","), kategoriAktif);

    if (prefersReducedMotion()) {
      kartu.forEach((k) => (k.style.display = cocokKe(k) ? "" : "none"));
      return;
    }

    const keluar = kartu.filter((k) => k.style.display !== "none" && !cocokKe(k));
    const state = Flip.getState(kartu);
    const terapkan = () => {
      gsap.set(keluar, { clearProps: "opacity,transform" });
      kartu.forEach((k) => (k.style.display = cocokKe(k) ? "" : "none"));
      Flip.from(state, {
        duration: 0.5,
        ease: "power2.inOut",
        absolute: true,
        scale: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4 }),
      });
    };

    if (keluar.length > 0) {
      gsap.to(keluar, { opacity: 0, scale: 0.9, duration: 0.25, onComplete: terapkan });
    } else {
      terapkan();
    }
  }, [kategoriAktif]);

  // Sorot kartu hasil pencarian: pulsa dan diberi ring sebentar.
  useEffect(() => {
    if (!sorotId) return;
    const el = document.getElementById(`destinasi-${sorotId}`);
    if (!el) return;
    el.style.display = "";
    if (!prefersReducedMotion()) {
      gsap.fromTo(el, { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 3, ease: "power2.inOut" });
    }
    el.classList.add("ring-2", "ring-lnd-merah", "ring-offset-4", "rounded-lnd");
    const t = window.setTimeout(() => el.classList.remove("ring-2", "ring-lnd-merah", "ring-offset-4"), 1800);
    return () => window.clearTimeout(t);
  }, [sorotId]);

  // Kartu masuk viewport: flip-up 3D dengan stagger 0.08 s.
  useEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-kartu]"),
        { y: 60, rotateX: 14, opacity: 0 },
        {
          y: 0,
          rotateX: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const jumlahCocok = isi.items.filter((d) => cocok(d.tags, kategoriAktif)).length;

  return (
    <section ref={scope} id="destinasi" aria-labelledby="judul-destinasi" className="scroll-mt-20 py-20 md:py-24">
      <div className="container-lnd">
        <SectionHeading
          id="judul-destinasi"
          judul={isi.judul}
          subjudul={isi.subjudul}
          aksi={
            <button type="button" onClick={() => onInfo("Segera hadir")} className="link-lnd">
              {isi.tautanLabel}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          }
        />

        <ul ref={grid} className="relative mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-6">
          {isi.items.map((d) => (
            <KartuDestinasi
              key={d.id}
              item={d}
              aktif={wishlist.has(d.id)}
              onWishlist={() => onWishlist(d.id)}
              tags={d.tags.join(",")}
            />
          ))}
        </ul>

        {jumlahCocok === 0 && <p className="mt-8 text-center text-lnd-muted">Belum ada destinasi untuk kategori ini.</p>}
      </div>
    </section>
  );
}

function KartuDestinasi({
  item,
  aktif,
  onWishlist,
  tags,
}: {
  item: ItemDestinasi;
  aktif: boolean;
  onWishlist: () => boolean;
  tags: string;
}) {
  const kartu = useRef<HTMLElement>(null);
  const fotoEl = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useTilt(kartu, { maks: 12 });

  // Seluruh kartu bisa diklik (kecuali tombol hati): foto mengembang lalu pindah ke detail.
  function buka(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-tanpa-buka]")) return;
    bukaDenganTransisi(
      fotoEl.current,
      { foto: item.foto, gradien: gradienDefault(item.id), nama: item.nama, wilayah: item.negara },
      () => navigate(`/destinasi/${item.id}`)
    );
  }

  return (
    <li data-kartu data-tags={tags} id={`destinasi-${item.id}`} className="group list-none">
      <div style={{ perspective: 900 }}>
        <article ref={kartu} onClick={buka} className="kartu-3d relative cursor-pointer overflow-hidden rounded-lnd bg-white shadow-lnd transition-shadow duration-300 hover:shadow-lnd-hover">
          <div ref={fotoEl} className="relative aspect-square overflow-hidden rounded-t-lnd">
            <div className="lapis-depan absolute inset-0 transition-transform duration-500 group-hover:scale-[1.08]">
              <Foto src={item.foto} alt={`Foto ${item.nama}`} gradien={gradienDefault(item.id)} />
            </div>
            <div data-tanpa-buka className="absolute right-3 top-3 z-10">
              <HeartButton aktif={aktif} nama={item.nama} onKlik={onWishlist} />
            </div>
          </div>
          <div className="lapis-teks relative p-4 pb-5">
            <p className="label-kecil">{item.negara}</p>
            <h3 className="mt-1 text-[18px] font-bold leading-snug text-lnd-navy">{item.nama}</h3>
            <p className="mt-1 line-clamp-2 min-h-[2.6em] pr-10 text-[13px] leading-snug text-lnd-muted">{item.tagline}</p>
            <button
              type="button"
              aria-label={`Lihat ${item.nama}`}
              className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-lnd-line bg-white text-lnd-navy transition-colors group-hover:border-lnd-merah group-hover:bg-lnd-merah group-hover:text-white"
            >
              <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-500 group-hover:-rotate-45" />
            </button>
          </div>
          <div className="kilau" aria-hidden="true" />
        </article>
      </div>
    </li>
  );
}
