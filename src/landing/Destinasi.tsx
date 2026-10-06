import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import Foto from "./Foto";
import HeartButton from "./HeartButton";
import SectionHeading from "./SectionHeading";
import type { IsiDestinasi, ItemDestinasi } from "./types";
import { gsap, Flip, prefersReducedMotion, useTilt } from "./efek";

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
    el.classList.add("ring-2", "ring-lnd-blue", "ring-offset-4", "rounded-lnd");
    const t = window.setTimeout(() => el.classList.remove("ring-2", "ring-lnd-blue", "ring-offset-4"), 1800);
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
              onInfo={onInfo}
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
  onInfo,
  tags,
}: {
  item: ItemDestinasi;
  aktif: boolean;
  onWishlist: () => boolean;
  onInfo: (pesan: string) => void;
  tags: string;
}) {
  const kartu = useRef<HTMLElement>(null);
  useTilt(kartu, { maks: 12 });

  return (
    <li data-kartu data-tags={tags} id={`destinasi-${item.id}`} className="group list-none">
      <div style={{ perspective: 900 }}>
        <article ref={kartu} className="kartu-3d relative overflow-hidden rounded-lnd bg-white shadow-lnd transition-shadow duration-300 hover:shadow-lnd-hover">
          <div className="relative aspect-square overflow-hidden rounded-t-lnd">
            <div className="lapis-depan absolute inset-0 transition-transform duration-500 group-hover:scale-[1.08]">
              <Foto src={item.foto} alt={`Foto ${item.nama}`} gradien={gradienDefault(item.id)} />
            </div>
            <div className="absolute right-3 top-3 z-10">
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
              onClick={() => onInfo("Segera hadir")}
              className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-lnd-line bg-white text-lnd-navy transition-colors group-hover:border-lnd-blue group-hover:bg-lnd-blue group-hover:text-white"
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

/** Gradien placeholder berbeda per destinasi, supaya kartu tanpa foto tidak abu-abu polos. */
function gradienDefault(id: string): string {
  const pilihan = [
    "linear-gradient(160deg,#5fd3c6 0%,#2aa98f 45%,#f6d58e 100%)",
    "linear-gradient(160deg,#9ed2ff 0%,#fff 45%,#1b5fe4 100%)",
    "linear-gradient(150deg,#e0524a 0%,#b3261e 50%,#3d2b1f 100%)",
    "linear-gradient(170deg,#c9e6f5 0%,#5b8db0 50%,#1f4e6b 100%)",
    "linear-gradient(160deg,#ffd27a 0%,#f08a6b 45%,#2f7fbf 100%)",
    "linear-gradient(160deg,#7fe0e6 0%,#1fb6c4 50%,#0e7f8f 100%)",
  ];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pilihan[h % pilihan.length];
}
