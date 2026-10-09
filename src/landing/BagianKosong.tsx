import { useEffect, useRef, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { gsap, gulirKe, prefersReducedMotion } from "./efek";

/**
 * Tampilan pengganti saat admin sudah menyalakan sebuah bagian tapi belum mengisi
 * itemnya. Sengaja tidak memakai contoh isi palsu: cukup kabar bahwa isi segera hadir.
 */
export default function BagianKosong({
  ikon,
  judul,
  teks,
  ajakNewsletter,
}: {
  ikon: ReactNode;
  judul: string;
  teks: string;
  /** tampilkan tombol yang menggulir ke bagian newsletter (isi true hanya kalau bagian itu tampil) */
  ajakNewsletter?: boolean;
}) {
  const kotak = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = kotak.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }
      );
      gsap.to(".kosong-ikon", { y: -6, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={kotak}
      className="relative mt-10 overflow-hidden rounded-lnd border border-lnd-sky-100 bg-lnd-sky px-6 py-12 text-center md:py-16"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/60" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-lnd-sky-100/70" />
      <div className="relative mx-auto max-w-md">
        <span className="kosong-ikon mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-lnd-merah shadow-lnd">
          {ikon}
        </span>
        <p className="mt-5 font-lnd-serif text-[24px] font-bold leading-snug text-lnd-navy md:text-[28px]">{judul}</p>
        <p className="mt-2 text-[15px] text-lnd-muted">{teks}</p>
        {ajakNewsletter && (
          <button type="button" onClick={() => gulirKe("newsletter")} className="link-lnd mt-5">
            Kabari saya lewat email <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
