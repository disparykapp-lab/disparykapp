import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import type { IsiNavbar } from "./types";
import { gsap, gulirKe, prefersReducedMotion, useMagnetic } from "./efek";

/** id bagian landing yang bisa dituju menu. Menu ke bagian lain (mis. buatan admin) dibiarkan. */
const BAGIAN_DIKENAL = ["destinasi", "gaya", "agenda", "berita", "testimoni", "newsletter", "footer"];

export default function Navbar({ isi, sudahMasuk, tersedia }: { isi: IsiNavbar; sudahMasuk: boolean; tersedia: string[] }) {
  // Menu ke bagian yang sedang disembunyikan tidak ditampilkan (kalau diklik tidak ke mana-mana).
  const menu = isi.menu.filter((m) => !BAGIAN_DIKENAL.includes(m.target) || tersedia.includes(m.target));
  const [scrolled, setScrolled] = useState(false);
  const [menuBuka, setMenuBuka] = useState(false);
  const header = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const tombolDaftar = useRef<HTMLAnchorElement>(null);
  const tombolBuka = useRef<HTMLButtonElement>(null);
  useMagnetic(tombolDaftar);

  // Navbar turun saat load (kecuali reduced motion).
  useEffect(() => {
    if (prefersReducedMotion() || !header.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(header.current, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.2 });
    }, header.current);
    return () => ctx.revert();
  }, []);

  // Setelah scroll > 40px: latar putih + blur + bayangan, tinggi mengecil.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu mobile: Esc menutup, fokus terkunci di dalam panel selama terbuka.
  useEffect(() => {
    if (!menuBuka) return;
    const el = panel.current;
    const fokusable = el?.querySelectorAll<HTMLElement>("a[href], button") ?? [];
    fokusable[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuBuka(false);
        tombolBuka.current?.focus();
        return;
      }
      if (e.key !== "Tab" || fokusable.length === 0) return;
      const awal = fokusable[0];
      const akhir = fokusable[fokusable.length - 1];
      if (e.shiftKey && document.activeElement === awal) {
        e.preventDefault();
        akhir.focus();
      } else if (!e.shiftKey && document.activeElement === akhir) {
        e.preventDefault();
        awal.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuBuka]);

  useEffect(() => {
    if (!menuBuka || prefersReducedMotion() || !panel.current) return;
    gsap.fromTo(panel.current, { yPercent: -100 }, { yPercent: 0, duration: 0.5, ease: "power3.out" });
  }, [menuBuka]);

  function ke(target: string) {
    setMenuBuka(false);
    gulirKe(target);
  }

  const kelas = scrolled
    ? "bg-white/85 py-2.5 shadow-[0_6px_20px_rgba(15,40,90,0.08)] backdrop-blur-md"
    : "bg-transparent py-5";

  return (
    <header ref={header} className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,padding] duration-300 ${kelas}`}>
      <nav aria-label="Utama" className="container-lnd flex items-center justify-between">
        <a href="#top" className="font-lnd-serif text-[22px] font-bold text-lnd-navy" aria-label={`${isi.logo} beranda`}>
          {isi.logo}
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {menu.map((m) => (
            <li key={m.target}>
              <button
                type="button"
                onClick={() => ke(m.target)}
                className="text-[15px] font-medium text-lnd-ink transition-colors hover:text-lnd-merah"
              >
                {m.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => gulirKe("destinasi")}
            aria-label="Cari destinasi"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-lnd-navy transition hover:bg-lnd-sky md:flex"
          >
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <Link
            to={sudahMasuk ? "/beranda" : "/login"}
            className="hidden px-3 text-[15px] font-medium text-lnd-ink transition hover:text-lnd-merah md:inline-block"
          >
            {sudahMasuk ? "Buka Aplikasi" : isi.tombolMasuk}
          </Link>
          <Link
            ref={tombolDaftar}
            to="/daftar"
            className="relative hidden overflow-hidden rounded-full bg-lnd-merah px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-lnd-merah-dark md:inline-block"
          >
            <span data-magnetic-inner className="inline-block">{isi.tombolDaftar}</span>
          </Link>
          <button
            ref={tombolBuka}
            type="button"
            onClick={() => setMenuBuka(true)}
            aria-expanded={menuBuka}
            aria-controls="menu-mobile"
            aria-label="Buka menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-lnd-navy lg:hidden"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </nav>

      {menuBuka && createPortal(
        <div
          id="menu-mobile"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 flex flex-col bg-white px-6 py-5 lg:hidden"
        >
          <div className="flex items-center justify-between">
            <span className="font-lnd-serif text-[22px] font-bold text-lnd-navy">{isi.logo}</span>
            <button
              type="button"
              onClick={() => setMenuBuka(false)}
              aria-label="Tutup menu"
              className="flex h-11 w-11 items-center justify-center rounded-full text-lnd-navy"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-10 flex flex-col gap-2">
            {menu.map((m) => (
              <li key={m.target}>
                <button
                  type="button"
                  onClick={() => ke(m.target)}
                  className="w-full rounded-xl px-3 py-4 text-left font-lnd-serif text-2xl font-bold text-lnd-navy hover:bg-lnd-sky"
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-3 pb-6">
            <Link to={sudahMasuk ? "/beranda" : "/login"} className="min-h-[48px] rounded-full border border-lnd-line text-center leading-[48px] font-semibold text-lnd-navy">
              {sudahMasuk ? "Buka Aplikasi" : isi.tombolMasuk}
            </Link>
            <Link to="/daftar" className="min-h-[48px] rounded-full bg-lnd-merah text-center leading-[48px] font-semibold text-white">
              {isi.tombolDaftar}
            </Link>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
