import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./landing.css";
import FooterLanding from "./FooterLanding";
import { KartuDestinasi } from "./Destinasi";
import { IkonNama } from "./ikon";
import { gsap, prefersReducedMotion, useLenis } from "./efek";
import { useWishlist } from "./wishlist";
import { useKontenLanding } from "./pratinjau";

/**
 * Daftar lengkap semua destinasi (`/destinasi`), dibuka lewat tautan "Lihat Semua
 * Destinasi" di beranda — beranda sendiri cuma menampilkan 4 teratas.
 */
export default function HalamanSemuaDestinasi() {
  const { session, profile } = useAuth();
  const { konten } = useKontenLanding();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null);
  const [wishlist, toggleWishlist] = useWishlist();
  const scope = useRef<HTMLElement>(null);

  useLenis();

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function kembali() {
    navigate("/", { state: { gulir: "destinasi" } });
  }

  const semua = konten.destinasi.isi.items;
  const tersaring = kategoriAktif ? semua.filter((d) => d.tags.includes(kategoriAktif)) : semua;

  // Kartu masuk viewport setiap kali daftar berubah (filter kategori ganti).
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-kartu]"),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.06 }
      );
    }, el);
    return () => ctx.revert();
  }, [tersaring.length, kategoriAktif]);

  return (
    <div className="min-h-screen bg-white text-lnd-ink">
      <header className="container-lnd flex items-center justify-between py-6">
        <button
          type="button"
          onClick={kembali}
          className="flex items-center gap-2 rounded-full border border-lnd-line px-4 py-2.5 text-[14px] font-semibold text-lnd-navy transition hover:border-lnd-merah hover:text-lnd-merah"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali
        </button>
        <span className="font-lnd-serif text-[20px] font-bold text-lnd-navy">{konten.navbar.isi.logo}</span>
      </header>

      <section ref={scope} className="pb-20">
        <div className="container-lnd">
          <p className="eyebrow">Destinasi</p>
          <h1 className="judul-section mt-2">Semua Destinasi</h1>
          <p className="mt-2 max-w-xl text-[15px] text-lnd-muted">
            Jelajahi seluruh destinasi wisata Kota Yogyakarta yang kami rekomendasikan.
          </p>

          {konten.kategori.isi.items.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Saring berdasarkan kategori">
              <button
                type="button"
                onClick={() => setKategoriAktif(null)}
                aria-pressed={!kategoriAktif}
                className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                  !kategoriAktif ? "border-lnd-merah bg-lnd-merah text-white" : "border-lnd-line text-lnd-navy hover:border-lnd-merah"
                }`}
              >
                Semua
              </button>
              {konten.kategori.isi.items.map((k) => {
                const aktif = kategoriAktif === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategoriAktif(aktif ? null : k.id)}
                    aria-pressed={aktif}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                      aktif ? "border-lnd-merah bg-lnd-merah text-white" : "border-lnd-line text-lnd-navy hover:border-lnd-merah"
                    }`}
                  >
                    <IkonNama nama={k.icon} size={14} /> {k.label}
                  </button>
                );
              })}
            </div>
          )}

          <ul className="relative mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
            {tersaring.map((d) => (
              <KartuDestinasi key={d.id} item={d} aktif={wishlist.has(d.id)} onWishlist={() => toggleWishlist(d.id)} tags={d.tags.join(",")} />
            ))}
          </ul>
          {tersaring.length === 0 && <p className="mt-8 text-center text-lnd-muted">Belum ada destinasi untuk kategori ini.</p>}
        </div>
      </section>

      {konten.footer.tampil && <FooterLanding isi={konten.footer.isi} navbarLogo={konten.navbar.isi.logo} onInfo={setToast} />}
      {session && profile && (
        <Link
          to="/beranda"
          className="fixed bottom-6 right-6 z-[60] rounded-full bg-lnd-merah px-5 py-2.5 text-[14px] font-semibold text-white shadow-lnd-hover"
        >
          Ke Aplikasi
        </Link>
      )}
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
