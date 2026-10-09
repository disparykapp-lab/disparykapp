import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
import { useKontenLanding } from "./pratinjau";
import type { LandingTergabung } from "../lib/landing";

/**
 * Landing page publik di `/`. Isi diambil dari tabel landing_konten (bisa diedit
 * admin di Kelola → Landing Page); kalau belum ada, pakai isi bawaan.
 */
export default function LandingPage() {
  const { session, profile } = useAuth();
  const sudahMasuk = !!session && !!profile;

  const { konten } = useKontenLanding();
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

  // Kembali dari halaman detail destinasi: langsung gulir ke bagian destinasi.
  const location = useLocation();
  const gulirAwal = (location.state as { gulir?: string } | null)?.gulir;

  // Konten berubah = tinggi section berubah, hitung ulang posisi ScrollTrigger.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [konten]);

  useEffect(() => {
    if (!gulirAwal) return;
    const t = window.setTimeout(() => gulirKe(gulirAwal), 350);
    return () => window.clearTimeout(t);
  }, [gulirAwal]);

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

      <div ref={bilahProgres} aria-hidden="true" className="fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-lnd-merah" style={{ transform: "scaleX(0)" }} />

      <Navbar isi={k.navbar.isi} sudahMasuk={sudahMasuk} tersedia={bagianTersedia(k)} />

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
          {k.paket.tampil && <Paket isi={k.paket.isi} gayaAktif={gayaAktif} onInfo={setToast} adaNewsletter={k.newsletter.tampil} />}
          {k.berita.tampil && <Berita isi={k.berita.isi} adaNewsletter={k.newsletter.tampil} />}
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

/** id bagian yang benar-benar ada di halaman, supaya menu tidak menunjuk ke bagian tersembunyi. */
function bagianTersedia(k: LandingTergabung): string[] {
  const peta: [string, boolean][] = [
    ["destinasi", k.destinasi.tampil],
    ["gaya", k.gaya.tampil],
    ["agenda", k.paket.tampil],
    ["berita", k.berita.tampil],
    ["testimoni", k.testimoni.tampil],
    ["newsletter", k.newsletter.tampil],
    ["footer", k.footer.tampil],
  ];
  return peta.filter(([, ada]) => ada).map(([id]) => id);
}
