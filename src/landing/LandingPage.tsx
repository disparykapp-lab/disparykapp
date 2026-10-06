import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ambilLanding, bawaanTergabung, type LandingTergabung } from "../lib/landing";
import "./landing.css";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Destinasi from "./Destinasi";
import Gaya from "./Gaya";
import Paket from "./Paket";
import Berita from "./Berita";
import Testimoni from "./Testimoni";
import Newsletter from "./Newsletter";
import FooterLanding from "./FooterLanding";
import { gsap, ScrollTrigger, gulirKe, prefersReducedMotion, useLenis } from "./efek";
import { useWishlist } from "./wishlist";

/**
 * Landing page publik di `/`. Isi diambil dari tabel landing_konten (bisa diedit
 * admin di Kelola → Landing Page); kalau belum ada, pakai isi bawaan.
 */
export default function LandingPage() {
  const { session, profile } = useAuth();
  const sudahMasuk = !!session && !!profile;

  const [konten, setKonten] = useState<LandingTergabung>(() => bawaanTergabung());
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null);
  const [gayaAktif, setGayaAktif] = useState<string | null>(null);
  const [sorotId, setSorotId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [wishlist, toggleWishlist] = useWishlist();
  const [tirai, setTirai] = useState(() => !prefersReducedMotion());

  const root = useRef<HTMLDivElement>(null);
  const bilahProgres = useRef<HTMLDivElement>(null);
  const tiraiEl = useRef<HTMLDivElement>(null);

  useLenis();

  useEffect(() => {
    let batal = false;
    ambilLanding().then((d) => {
      if (!batal) setKonten(d);
    });
    return () => {
      batal = true;
    };
  }, []);

  // Konten berubah = tinggi section berubah, hitung ulang posisi ScrollTrigger.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [konten]);

  // Tirai putih naik (clip-path) di awal, lalu dibuang dari DOM.
  useLayoutEffect(() => {
    const el = tiraiEl.current;
    if (!el || prefersReducedMotion()) return;
    gsap.to(el, {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 1,
      ease: "expo.inOut",
      delay: 0.1,
      onComplete: () => setTirai(false),
    });
  }, []);

  // Progress bar scroll di atas layar.
  useLayoutEffect(() => {
    const bar = bilahProgres.current;
    if (!bar) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bar,
        { scaleX: 0 },
        { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: true } }
      );
    }, bar);
    return () => ctx.revert();
  }, []);

  // Pesan singkat (mis. "Segera hadir") hilang setelah 2,2 detik.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function cari(id: string) {
    setSorotId(id);
    gulirKe("destinasi");
  }

  const k = konten;

  return (
    <div ref={root} className="min-h-screen bg-white text-lnd-ink">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lnd"
      >
        Lewati ke konten
      </a>

      {tirai && <div ref={tiraiEl} className="tirai-intro" aria-hidden="true" style={{ clipPath: "inset(0% 0% 0% 0%)" }} />}

      <div ref={bilahProgres} aria-hidden="true" className="fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-lnd-blue" style={{ transform: "scaleX(0)" }} />

      <Navbar isi={k.navbar.isi} sudahMasuk={sudahMasuk} />

      <main id="konten">
        <Hero
          isi={k.hero.isi}
          kategori={k.kategori.isi}
          destinasi={k.destinasi.isi.items}
          kategoriAktif={kategoriAktif}
          onKategori={setKategoriAktif}
          onCari={cari}
        />

        <div>
          {k.destinasi.tampil && (
            <Destinasi
              isi={k.destinasi.isi}
              kategoriAktif={kategoriAktif}
              sorotId={sorotId}
              wishlist={wishlist}
              onWishlist={toggleWishlist}
              onInfo={setToast}
            />
          )}
          {k.gaya.tampil && <Gaya isi={k.gaya.isi} aktif={gayaAktif} onPilih={setGayaAktif} />}
          {k.paket.tampil && k.paket.isi.items.length > 0 && (
            <Paket isi={k.paket.isi} gayaAktif={gayaAktif} onInfo={setToast} />
          )}
          {k.berita.tampil && k.berita.isi.items.length > 0 && <Berita isi={k.berita.isi} />}
          {k.testimoni.tampil && <Testimoni isi={k.testimoni.isi} />}
          {k.newsletter.tampil && <Newsletter isi={k.newsletter.isi} />}
        </div>
      </main>

      {k.footer.tampil && <FooterLanding isi={k.footer.isi} navbarLogo={k.navbar.isi.logo} onInfo={setToast} />}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-lnd-navy px-5 py-2.5 text-[14px] font-medium text-white shadow-lnd-hover"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
