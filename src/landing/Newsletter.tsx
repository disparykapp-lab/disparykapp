import { useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import Foto from "./Foto";
import type { IsiNewsletter } from "./types";
import { gsap, prefersReducedMotion, useMagnetic } from "./efek";

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter. Mock: email divalidasi di browser tapi TIDAK dikirim atau disimpan ke mana pun.
 */
export default function Newsletter({ isi }: { isi: IsiNewsletter }) {
  const [email, setEmail] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const tombol = useRef<HTMLButtonElement>(null);
  useMagnetic(tombol);

  function kirim(e: FormEvent) {
    e.preventDefault();
    if (!POLA_EMAIL.test(email.trim())) {
      setGalat("Masukkan alamat email yang valid.");
      if (input.current && !prefersReducedMotion()) {
        gsap.fromTo(input.current, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
      }
      return;
    }
    setGalat(null);
    setSukses(true);
  }

  return (
    <section id="newsletter" aria-labelledby="judul-newsletter" className="scroll-mt-20 relative overflow-hidden bg-lnd-sky">
      <div className="container-lnd grid items-center gap-6 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:py-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[32%] md:block" aria-hidden="true">
          <div className="h-full w-full [mask-image:linear-gradient(90deg,#000_40%,transparent)]">
            <Foto src={isi.foto} alt="" gradien="linear-gradient(90deg,#d98a9b 0%,#7a1a33 100%)" />
          </div>
        </div>

        <div className="relative hidden md:block" aria-hidden="true" />

        <div className="relative md:col-span-1">
          <p className="eyebrow">{isi.eyebrow}</p>
          <h2 id="judul-newsletter" className="mt-2 font-lnd-serif text-[26px] font-bold leading-tight text-lnd-navy md:text-[30px]">
            {isi.judul}
          </h2>
          <p className="mt-2 text-[15px] text-lnd-ink">{isi.teks}</p>
        </div>

        <div className="relative">
          {sukses ? (
            <div role="status" className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-lnd-merah px-6 py-3 text-[15px] font-semibold text-white">
              <Check size={18} aria-hidden="true" /> Terima kasih! Kamu sudah terdaftar.
            </div>
          ) : (
            <form onSubmit={kirim} noValidate className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-lnd">
                <label htmlFor="email-newsletter" className="sr-only">
                  Alamat email
                </label>
                <input
                  id="email-newsletter"
                  ref={input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isi.placeholder}
                  aria-invalid={galat ? true : undefined}
                  aria-describedby={galat ? "galat-newsletter" : undefined}
                  className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-lnd-navy outline-none placeholder:text-lnd-muted"
                />
                <button
                  ref={tombol}
                  type="submit"
                  className="relative shrink-0 rounded-full bg-lnd-merah px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-lnd-merah-dark"
                >
                  <span data-magnetic-inner className="inline-block">{isi.tombol}</span>
                </button>
              </div>
              {galat && (
                <p id="galat-newsletter" role="alert" className="pl-5 text-[13px] text-lnd-heart">
                  {galat}
                </p>
              )}
              <p className="pl-5 text-[12px] text-lnd-muted">{isi.catatanPrivasi}</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
