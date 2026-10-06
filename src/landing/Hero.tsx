import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { ArrowRight, Search } from "lucide-react";
import Foto from "./Foto";
import { IkonNama } from "./ikon";
import type { IsiHero, IsiKategori, ItemDestinasi } from "./types";
import { gsap, prefersReducedMotion, isCoarsePointer, useMagnetic } from "./efek";

interface Props {
  isi: IsiHero;
  kategori: IsiKategori;
  destinasi: ItemDestinasi[];
  kategoriAktif: string | null;
  onKategori: (id: string | null) => void;
  onCari: (id: string) => void;
}

export default function Hero({ isi, kategori, destinasi, kategoriAktif, onKategori, onCari }: Props) {
  const section = useRef<HTMLElement>(null);
  const tombolCari = useRef<HTMLButtonElement>(null);
  useMagnetic(tombolCari);

  // Animasi load: tirai sudah dibuka oleh LandingPage, lalu konten hero masuk berurutan.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !section.current) return;
    const el = section.current;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".hero-foto", { scale: 1.18 }, { scale: 1.05, duration: 2.4, ease: "power2.out" }, 0)
        .fromTo(".hero-eyebrow", { opacity: 0, letterSpacing: "0.4em" }, { opacity: 1, letterSpacing: "0.18em", duration: 0.8 }, 0.3)
        .fromTo(".hero-baris", { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.12 }, 0.35)
        .fromTo(".hero-subjudul", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, 0.8)
        .fromTo(".hero-cari", { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "back.out(1.4)" }, 1.0)
        .fromTo(".hero-kategori", { opacity: 0, rotateX: -25 }, { opacity: 1, rotateX: 0, duration: 1.0, ease: "power4.out" }, 1.2)
        .fromTo(".hero-kategori-item", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)", stagger: 0.06 }, 1.4);
    }, el);
    return () => ctx.revert();
  }, []);

  // Parallax saat scroll (semua perangkat), dan lapisan kedalaman mengikuti kursor di perangkat presisi.
  useEffect(() => {
    const el = section.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(".hero-foto", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
      });
      gsap.to(".hero-teks", {
        yPercent: -12,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
      });
      gsap.to(".hero-kategori", {
        opacity: 0.4,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
      });
    }, el);

    if (isCoarsePointer()) return () => ctx.revert();

    const lapisan = [
      { sel: ".hero-foto", kekuatan: 8 },
      { sel: ".hero-teks", kekuatan: 14 },
      { sel: ".hero-cari", kekuatan: 22 },
      { sel: ".hero-kategori", kekuatan: 30 },
    ].map(({ sel, kekuatan }) => {
      const target = el.querySelector(sel);
      return {
        target,
        kekuatan,
        x: gsap.quickTo(target, "x", { duration: 0.6, ease: "power3.out" }),
        y: gsap.quickTo(target, "y", { duration: 0.6, ease: "power3.out" }),
      };
    });
    const putar = gsap.quickTo(el.querySelector(".hero-wrap"), "rotateY", { duration: 0.8, ease: "power3.out" });
    const putarX = gsap.quickTo(el.querySelector(".hero-wrap"), "rotateX", { duration: 0.8, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      for (const l of lapisan) {
        if (!l.target) continue;
        l.x(-nx * l.kekuatan * 2);
        l.y(-ny * l.kekuatan * 2);
      }
      putar(nx * 4);
      putarX(-ny * 3);
    };
    const onLeave = () => {
      for (const l of lapisan) {
        l.x(0);
        l.y(0);
      }
      putar(0);
      putarX(0);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={section}
      id="top"
      aria-labelledby="judul-hero"
      className="relative z-10 h-[580px] md:h-[640px]"
      style={{ perspective: "1200px" }}
    >
      <div className="hero-wrap relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
        {/* Lapisan paling jauh: foto */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="hero-foto absolute inset-0">
            <Foto
              src={isi.foto}
              alt=""
              lazy={false}
              prioritas
              gradien="linear-gradient(100deg,#fdf1f4 0%,#e8a6b4 28%,#b33951 60%,#8e1e3c 100%)"
            />
          </div>
        </div>

        {/* Gradien putih dari kiri supaya teks terbaca */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,0.92)_30%,rgba(255,255,255,0.3)_60%,rgba(255,255,255,0)_80%)]" />

        <div className="container-lnd relative flex h-full flex-col justify-start pt-[112px] md:pt-[104px]">
          <div className="hero-teks max-w-[620px]">
            <p className="hero-eyebrow eyebrow">{isi.eyebrow}</p>
            <h1 id="judul-hero" className="mt-4 font-lnd-serif text-[48px] font-bold leading-[0.98] tracking-[-0.02em] text-lnd-navy md:text-[clamp(56px,7vw,96px)]">
              {isi.judul.split("\n").map((baris) => (
                <span key={baris} className="block overflow-hidden pb-1">
                  <span className="hero-baris block">{baris}</span>
                </span>
              ))}
            </h1>
            <p className="hero-subjudul mt-4 max-w-md text-[17px] text-lnd-ink">{isi.subjudul}</p>
          </div>

          <div className="hero-cari mt-6 max-w-[520px]">
            <HeroSearch
              placeholder={isi.placeholderCari}
              destinasi={destinasi}
              tombolRef={tombolCari}
              onCari={onCari}
            />
          </div>
        </div>

        {/* Keterangan foto kanan bawah */}
        <div className="absolute bottom-[96px] right-6 hidden max-w-[200px] text-right text-white drop-shadow md:block lg:right-[100px]">
          <p className="text-sm font-semibold">{isi.captionLokasi}</p>
          <div className="my-2 ml-auto h-px w-16 bg-white/80" />
          <p className="text-sm italic">{isi.captionKalimat}</p>
        </div>

        {/* Lapisan paling dekat: category bar yang menimpa tepi bawah hero */}
        <div className="hero-kategori absolute -bottom-[50px] left-1/2 z-20 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 rounded-t-[28px] bg-white px-4 pb-3 pt-5 shadow-lnd md:px-6">
          <ul className="flex items-start justify-around gap-2" role="list">
            {kategori.items.map((k) => {
              const aktif = kategoriAktif === k.id;
              return (
                <li key={k.id} className="hero-kategori-item">
                  <button
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => onKategori(aktif ? null : k.id)}
                    className={`group flex min-w-[56px] flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 text-center transition ${
                      aktif ? "text-lnd-merah" : "text-lnd-navy hover:text-lnd-merah"
                    }`}
                  >
                    <span className={`transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${aktif ? "text-lnd-merah" : ""}`}>
                      <IkonNama nama={k.icon} size={24} />
                    </span>
                    <span className="text-[11px] font-medium leading-tight md:text-[12px]">{k.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HeroSearch({
  placeholder,
  destinasi,
  tombolRef,
  onCari,
}: {
  placeholder: string;
  destinasi: ItemDestinasi[];
  tombolRef: RefObject<HTMLButtonElement | null>;
  onCari: (id: string) => void;
}) {
  const [teks, setTeks] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const [kosong, setKosong] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const saran = useMemo(() => {
    const q = teks.trim().toLowerCase();
    if (!q) return [];
    return destinasi.filter((d) => `${d.nama} ${d.negara}`.toLowerCase().includes(q)).slice(0, 6);
  }, [teks, destinasi]);

  // Tutup dropdown saat klik di luar.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setTerbuka(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pilih(d: ItemDestinasi) {
    setTeks(d.nama);
    setTerbuka(false);
    setKosong(false);
    onCari(d.id);
  }

  function kirim(e: FormEvent) {
    e.preventDefault();
    if (terbuka && saran[aktif]) return pilih(saran[aktif]);
    const cocok = saran[0];
    if (!cocok) {
      setKosong(true);
      return;
    }
    pilih(cocok);
  }

  function tombolKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!terbuka || saran.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAktif((i) => (i + 1) % saran.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktif((i) => (i - 1 + saran.length) % saran.length);
    } else if (e.key === "Escape") {
      setTerbuka(false);
    }
  }

  return (
    <div ref={wrap} className="relative">
      <form
        role="search"
        onSubmit={kirim}
        className="fokus-cincin flex items-center gap-2 rounded-full bg-white py-2 pl-5 pr-2 shadow-lnd transition-shadow"
      >
        <Search size={20} strokeWidth={1.8} className="shrink-0 text-lnd-muted" aria-hidden="true" />
        <label htmlFor="cari-destinasi" className="sr-only">
          Cari destinasi
        </label>
        <input
          id="cari-destinasi"
          type="search"
          value={teks}
          autoComplete="off"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={terbuka && saran.length > 0}
          aria-controls="saran-destinasi"
          aria-autocomplete="list"
          aria-activedescendant={terbuka && saran[aktif] ? `saran-${saran[aktif].id}` : undefined}
          onChange={(e) => {
            setTeks(e.target.value);
            setTerbuka(true);
            setAktif(0);
            setKosong(false);
          }}
          onFocus={() => setTerbuka(true)}
          onKeyDown={tombolKey}
          className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-lnd-navy outline-none placeholder:text-lnd-muted"
        />
        <button
          ref={tombolRef}
          type="submit"
          className="relative shrink-0 rounded-full bg-lnd-merah px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-lnd-merah-dark"
        >
          <span data-magnetic-inner className="inline-flex items-center gap-2">
            Cari
          </span>
        </button>
      </form>

      {terbuka && saran.length > 0 && (
        <ul
          id="saran-destinasi"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl bg-white py-2 shadow-lnd-hover"
        >
          {saran.map((d, i) => (
            <li
              key={d.id}
              id={`saran-${d.id}`}
              role="option"
              aria-selected={i === aktif}
              onMouseDown={(e) => {
                e.preventDefault();
                pilih(d);
              }}
              onMouseEnter={() => setAktif(i)}
              className={`flex cursor-pointer items-center justify-between px-5 py-2.5 text-[15px] ${
                i === aktif ? "bg-lnd-sky text-lnd-merah" : "text-lnd-ink"
              }`}
            >
              <span className="font-semibold">{d.nama}</span>
              <span className="flex items-center gap-1 text-[12px] text-lnd-muted">
                {d.negara} <ArrowRight size={12} aria-hidden="true" />
              </span>
            </li>
          ))}
        </ul>
      )}
      {kosong && <p className="mt-2 pl-5 text-sm text-lnd-heart">Destinasi itu belum ada. Coba kata lain.</p>}
    </div>
  );
}
