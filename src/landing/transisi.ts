import { gsap, prefersReducedMotion } from "./efek";

/** Gradien placeholder berbeda per destinasi, supaya kartu tanpa foto tidak abu-abu polos. */
export function gradienDefault(id: string): string {
  const pilihan = [
    "linear-gradient(160deg,#5fd3c6 0%,#2aa98f 45%,#f6d58e 100%)",
    "linear-gradient(160deg,#f2b8c4 0%,#fff 45%,#8e1e3c 100%)",
    "linear-gradient(150deg,#e0524a 0%,#b3261e 50%,#3d2b1f 100%)",
    "linear-gradient(170deg,#c9e6f5 0%,#5b8db0 50%,#1f4e6b 100%)",
    "linear-gradient(160deg,#ffd27a 0%,#f08a6b 45%,#7a1a33 100%)",
    "linear-gradient(160deg,#7fe0e6 0%,#1fb6c4 50%,#0e7f8f 100%)",
  ];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pilihan[h % pilihan.length];
}

/** Lapisan foto yang sedang "terbang" dari kartu ke layar penuh. */
let lapisan: HTMLDivElement | null = null;
/** Jaga-jaga: kalau halaman tujuan tidak pernah memanggil tutupTransisi (mis. dialihkan ke login). */
let cadangan = 0;

/**
 * Transisi kartu → halaman detail: foto kartu mengembang memenuhi layar
 * (sudut membulat jadi tajam), nama destinasi muncul di tengah, lalu `lanjut()`
 * dipanggil untuk pindah halaman. Halaman tujuan memanggil `tutupTransisi()`.
 */
export function bukaDenganTransisi(
  sumber: HTMLElement | null,
  data: { foto: string; gradien: string; nama: string; wilayah: string },
  lanjut: () => void
): void {
  if (!sumber || prefersReducedMotion() || lapisan) {
    lanjut();
    return;
  }
  const r = sumber.getBoundingClientRect();
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:fixed;z-index:95;overflow:hidden;pointer-events:none;
    left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:16px;
    background:${data.gradien};`;

  if (data.foto) {
    const img = document.createElement("img");
    img.src = data.foto;
    img.alt = "";
    img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
    el.appendChild(img);
  }
  const gelap = document.createElement("div");
  gelap.style.cssText =
    "position:absolute;inset:0;opacity:0;background:linear-gradient(180deg,rgba(11,27,58,.15) 0%,rgba(11,27,58,.25) 45%,rgba(11,27,58,.75) 100%);";
  el.appendChild(gelap);

  const teks = document.createElement("div");
  teks.style.cssText =
    "position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:#fff;padding:0 24px;";
  teks.innerHTML = `<p style="font-size:12px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;opacity:0" data-t="wilayah"></p>
    <p style="font-family:var(--font-lnd-serif);font-weight:700;font-size:clamp(44px,9vw,96px);line-height:1;margin-top:10px;opacity:0" data-t="nama"></p>`;
  teks.querySelector<HTMLElement>('[data-t="wilayah"]')!.textContent = data.wilayah;
  teks.querySelector<HTMLElement>('[data-t="nama"]')!.textContent = data.nama;
  el.appendChild(teks);

  document.body.appendChild(el);
  lapisan = el;

  gsap
    .timeline({
      onComplete: () => {
        cadangan = window.setTimeout(tutupTransisi, 4000);
        lanjut();
      },
    })
    .to(sumber, { scale: 0.96, duration: 0.15, ease: "power2.out" })
    .to(el, {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      borderRadius: 0,
      duration: 0.85,
      ease: "expo.inOut",
    })
    .to(gelap, { opacity: 1, duration: 0.6 }, "<0.25")
    .fromTo(teks.querySelector('[data-t="wilayah"]'), { opacity: 0, y: 16 }, { opacity: 0.9, y: 0, duration: 0.5 }, "-=0.45")
    .fromTo(teks.querySelector('[data-t="nama"]'), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
    .set(sumber, { scale: 1 });
}

/** Dipanggil halaman detail setelah tampil: lapisan transisi memudar lalu dibuang. */
export function tutupTransisi(): void {
  window.clearTimeout(cadangan);
  const el = lapisan;
  if (!el) return;
  lapisan = null;
  gsap.to(el, { opacity: 0, duration: 0.6, delay: 0.15, ease: "power2.out", onComplete: () => el.remove() });
}
