import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Lightbulb, MapPin, Navigation } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./landing.css";
import Foto from "./Foto";
import HeartButton from "./HeartButton";
import FooterLanding from "./FooterLanding";
import { IkonNama } from "./ikon";
import type { ItemDestinasi, NamaIkon } from "./types";
import { gsap, keAtasLangsung, prefersReducedMotion, useLenis } from "./efek";
import { bukaDenganTransisi, gradienDefault, tutupTransisi } from "./transisi";
import { useWishlist } from "./wishlist";
import { useKontenLanding } from "./pratinjau";

/**
 * Halaman detail destinasi (`/destinasi/:id`). Dibuka dari kartu di landing dengan
 * transisi foto mengembang; data sama dengan landing (tabel landing_konten).
 */
export default function HalamanDestinasi() {
  const { id = "" } = useParams();
  const { session, profile } = useAuth();
  const { konten, siap } = useKontenLanding();
  const [toast, setToast] = useState<string | null>(null);

  useLenis();

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const semua = konten.destinasi.isi.items;
  const item = semua.find((d) => d.id === id);

  // Item belum ketemu di isi bawaan: tunggu data dari server dulu (lapisan transisi tetap menutupi).
  useEffect(() => {
    if (siap && !item) tutupTransisi();
  }, [siap, item]);

  if (!item) {
    if (!siap) return <div className="min-h-screen bg-white" />;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="eyebrow">Destinasi</p>
        <h1 className="judul-section">Destinasi tidak ditemukan</h1>
        <Link to="/" className="link-lnd">
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-lnd-ink">
      {/* key: pindah ke destinasi lain = semua animasi diputar ulang dari awal */}
      <Detail
        key={item.id}
        item={item}
        lainnya={semua.filter((d) => d.id !== item.id)}
        kategori={konten.kategori.isi.items}
        logo={konten.navbar.isi.logo}
      />
      {konten.footer.tampil && (
        <FooterLanding isi={konten.footer.isi} navbarLogo={konten.navbar.isi.logo} onInfo={setToast} />
      )}
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

function Detail({
  item,
  lainnya,
  kategori,
  logo,
}: {
  item: ItemDestinasi;
  lainnya: ItemDestinasi[];
  kategori: { id: string; label: string; icon: NamaIkon }[];
  logo: string;
}) {
  const navigate = useNavigate();
  const [wishlist, toggleWishlist] = useWishlist();
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const tentang = useRef<HTMLElement>(null);

  const deskripsi = item.deskripsi?.trim() || item.tagline;
  const aktivitas = (item.aktivitas ?? []).filter((a) => a.judul.trim());
  const tips = item.tips?.trim();
  const tagKategori = kategori.filter((k) => item.tags.includes(k.id));
  const gradien = gradienDefault(item.id);
  const urlPeta = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.nama}, ${item.negara}`)}`;

  // Mulai dari atas, lalu lapisan transisi dari kartu memudar memperlihatkan hero.
  useLayoutEffect(() => {
    keAtasLangsung();
    tutupTransisi();
  }, []);

  // Animasi masuk hero: foto zoom-out pelan, huruf nama naik satu per satu, info menyusul.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.2 });
      tl.fromTo(".dt-foto", { scale: 1.2 }, { scale: 1.05, duration: 2.4, ease: "power2.out" }, 0)
        .fromTo(".dt-atas", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.2)
        .fromTo(".dt-wilayah", { opacity: 0, letterSpacing: "0.5em" }, { opacity: 1, letterSpacing: "0.3em", duration: 0.9 }, 0.3)
        .fromTo(".dt-huruf", { yPercent: 110, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1, ease: "expo.out", stagger: 0.035 }, 0.4)
        .fromTo(".dt-tagline", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, 0.9)
        .fromTo(".dt-chip", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)", stagger: 0.06 }, 1.05)
        .fromTo(".dt-gulir", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.3);
    }, el);
    return () => ctx.revert();
  }, []);

  // Efek gulir: parallax foto hero, kata deskripsi menyala bertahap, kartu aktivitas naik.
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(".dt-foto-wrap", {
        yPercent: 25,
        ease: "none",
        scrollTrigger: { trigger: hero.current, start: "top top", end: "bottom top", scrub: 0.5 },
      });
      gsap.to(".dt-hero-teks", {
        yPercent: -30,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: hero.current, start: "top top", end: "bottom top", scrub: 0.5 },
      });
      gsap.fromTo(
        ".dt-kata",
        { opacity: 0.15 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: "none",
          scrollTrigger: { trigger: tentang.current, start: "top 75%", end: "bottom 55%", scrub: true },
        }
      );
      gsap.fromTo(
        ".dt-reveal",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".dt-aktivitas", start: "top 85%", once: true },
        }
      );
      gsap.fromTo(
        ".dt-lain",
        { x: 60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ".dt-lainnya", start: "top 85%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  function kembali() {
    navigate("/", { state: { gulir: "destinasi" } });
  }

  function bukaLain(d: ItemDestinasi, sumber: HTMLElement | null) {
    bukaDenganTransisi(sumber, { foto: d.foto, gradien: gradienDefault(d.id), nama: d.nama, wilayah: d.negara }, () =>
      navigate(`/destinasi/${d.id}`)
    );
  }

  return (
    <div ref={root}>
      {/* HERO layar penuh */}
      <section ref={hero} aria-labelledby="judul-destinasi" className="relative h-[100svh] min-h-[560px] overflow-hidden bg-lnd-navy">
        <div className="dt-foto-wrap absolute inset-0">
          <div className="dt-foto absolute inset-0">
            <Foto src={item.foto} alt={`Foto ${item.nama}`} gradien={gradien} lazy={false} prioritas />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,27,58,0.45)_0%,rgba(11,27,58,0.1)_30%,rgba(11,27,58,0.35)_60%,rgba(11,27,58,0.9)_100%)]"
        />

        <div className="dt-atas container-lnd absolute inset-x-0 top-0 z-10 flex items-center justify-between pt-6">
          <button
            type="button"
            onClick={kembali}
            className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-[14px] font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Kembali
          </button>
          <span className="font-lnd-serif text-[22px] font-bold text-white">{logo}</span>
          <HeartButton aktif={wishlist.has(item.id)} nama={item.nama} onKlik={() => toggleWishlist(item.id)} />
        </div>

        <div className="dt-hero-teks container-lnd absolute inset-x-0 bottom-0 z-10 pb-24 text-white md:pb-28">
          <p className="dt-wilayah flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.3em] text-white/85">
            <MapPin size={14} aria-hidden="true" /> {item.negara}
          </p>
          <h1
            id="judul-destinasi"
            aria-label={item.nama}
            className="mt-3 font-lnd-serif text-[56px] font-bold leading-[0.95] tracking-[-0.02em] md:text-[clamp(72px,10vw,140px)]"
          >
            {item.nama.split(" ").map((kata, i) => (
              <span key={i} aria-hidden="true" className="mr-[0.25em] inline-block overflow-hidden pb-2 align-bottom last:mr-0">
                {Array.from(kata).map((h, j) => (
                  <span key={j} className="dt-huruf inline-block">
                    {h}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className="dt-tagline mt-3 max-w-lg text-[17px] text-white/90 md:text-[19px]">{item.tagline}</p>
          {tagKategori.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {tagKategori.map((k) => (
                <li
                  key={k.id}
                  className="dt-chip flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[13px] font-medium backdrop-blur"
                >
                  <IkonNama nama={k.icon} size={15} /> {k.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div aria-hidden="true" className="dt-gulir absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/80">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em]">Gulir</span>
          <span className="garis-gulir" />
        </div>
      </section>

      {/* TENTANG: kata-kata menyala mengikuti gulir */}
      <section ref={tentang} className="py-20 md:py-28">
        <div className="container-lnd grid gap-10 md:grid-cols-[1fr_320px] md:gap-16">
          <div>
            <p className="eyebrow">Tentang Destinasi</p>
            <p className="mt-5 font-lnd-serif text-[24px] font-semibold leading-[1.45] text-lnd-navy md:text-[32px]">
              {deskripsi.split(" ").map((kata, i) => (
                <span key={i} className="dt-kata">
                  {kata}{" "}
                </span>
              ))}
            </p>
          </div>
          <aside className="h-fit rounded-lnd bg-lnd-sky p-6">
            <p className="label-kecil">Lokasi</p>
            <p className="mt-1 flex items-center gap-2 text-[17px] font-bold text-lnd-navy">
              <MapPin size={18} className="text-lnd-merah" aria-hidden="true" /> {item.negara}
            </p>
            <a
              href={urlPeta}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-lnd-merah px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-lnd-merah-dark"
            >
              <Navigation size={16} aria-hidden="true" /> Petunjuk Arah
            </a>
          </aside>
        </div>
      </section>

      {/* AKTIVITAS */}
      {aktivitas.length > 0 && (
        <section className="dt-aktivitas bg-lnd-sky py-20 md:py-24">
          <div className="container-lnd">
            <p className="eyebrow dt-reveal">Pengalaman</p>
            <h2 className="judul-section dt-reveal mt-2">Yang Bisa Kamu Lakukan</h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {aktivitas.map((a, i) => (
                <li key={a.judul} className="dt-reveal group relative overflow-hidden rounded-lnd bg-white p-6 shadow-lnd transition-shadow hover:shadow-lnd-hover">
                  <span aria-hidden="true" className="absolute -right-2 -top-4 font-lnd-serif text-[88px] font-bold leading-none text-lnd-sky-100 transition-transform duration-500 group-hover:-translate-y-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-lnd-merah text-white transition-transform duration-500 group-hover:rotate-[-10deg] group-hover:scale-110">
                    <IkonNama nama={a.icon} size={22} />
                  </span>
                  <h3 className="relative mt-5 text-[18px] font-bold text-lnd-navy">{a.judul}</h3>
                  <p className="relative mt-1.5 text-[14px] leading-relaxed text-lnd-muted">{a.teks}</p>
                </li>
              ))}
            </ol>
            {tips && (
              <p className="dt-reveal mt-8 flex items-start gap-3 rounded-lnd border border-lnd-sky-100 bg-white p-5 text-[14px] text-lnd-ink">
                <Lightbulb size={20} className="mt-0.5 shrink-0 text-lnd-merah" aria-hidden="true" />
                <span>
                  <strong className="text-lnd-navy">Tips: </strong>
                  {tips}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {/* DESTINASI LAINNYA: klik = transisi yang sama ke destinasi berikutnya */}
      {lainnya.length > 0 && (
        <section className="dt-lainnya py-20 md:py-24">
          <div className="container-lnd">
            <div className="flex items-end justify-between gap-4">
              <h2 className="judul-section">Jelajahi Lainnya</h2>
              <button type="button" onClick={kembali} className="link-lnd shrink-0">
                Semua Destinasi <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
            <ul className="tanpa-scrollbar -mx-6 mt-8 flex snap-x gap-4 overflow-x-auto px-6 pb-4 md:mx-0 md:px-0">
              {lainnya.map((d) => (
                <KartuLain key={d.id} item={d} onBuka={bukaLain} />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function KartuLain({ item, onBuka }: { item: ItemDestinasi; onBuka: (d: ItemDestinasi, sumber: HTMLElement | null) => void }) {
  const foto = useRef<HTMLDivElement>(null);
  return (
    <li className="dt-lain w-[220px] shrink-0 snap-start md:w-[260px]">
      <button type="button" onClick={() => onBuka(item, foto.current)} className="group block w-full text-left">
        <div ref={foto} className="relative aspect-[3/4] overflow-hidden rounded-lnd shadow-lnd">
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
            <Foto src={item.foto} alt="" gradien={gradienDefault(item.id)} />
          </div>
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(11,27,58,0.85)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{item.negara}</p>
            <p className="mt-1 font-lnd-serif text-[22px] font-bold leading-tight">{item.nama}</p>
          </div>
          <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lnd-navy transition-colors group-hover:bg-lnd-merah group-hover:text-white">
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-500 group-hover:rotate-45" />
          </span>
        </div>
      </button>
    </li>
  );
}
