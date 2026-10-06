import { useRef } from "react";
import { Heart } from "lucide-react";
import { gsap } from "./efek";

/** Tombol hati wishlist. Saat aktif: pop + 6 titik kecil memancar. */
export default function HeartButton({
  aktif,
  nama,
  onKlik,
}: {
  aktif: boolean;
  nama: string;
  onKlik: () => boolean;
}) {
  const tombol = useRef<HTMLButtonElement>(null);

  function klik() {
    const sekarang = onKlik();
    const el = tombol.current;
    if (!el || !sekarang) return;
    gsap.fromTo(el, { scale: 1 }, { scale: 1.35, duration: 0.15, ease: "power2.out", yoyo: true, repeat: 1 });
    for (let i = 0; i < 6; i++) {
      const titik = document.createElement("span");
      titik.className = "titik-hati";
      el.appendChild(titik);
      const sudut = (i / 6) * Math.PI * 2;
      gsap.to(titik, {
        x: Math.cos(sudut) * 16,
        y: Math.sin(sudut) * 16,
        opacity: 0,
        scale: 0.4,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => titik.remove(),
      });
    }
  }

  return (
    <button
      ref={tombol}
      type="button"
      onClick={klik}
      aria-pressed={aktif}
      aria-label={aktif ? `Hapus ${nama} dari wishlist` : `Tambah ${nama} ke wishlist`}
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur transition hover:bg-white"
    >
      <Heart
        size={18}
        strokeWidth={1.8}
        className={aktif ? "text-lnd-heart" : "text-lnd-navy"}
        fill={aktif ? "var(--color-lnd-heart)" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
