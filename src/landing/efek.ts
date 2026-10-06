import { useEffect, useLayoutEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, Flip } from "./gsap";
import Lenis from "lenis";

export { gsap, ScrollTrigger, Flip };

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Lenis (gulir halus) hanya aktif di halaman landing. Dimatikan saat reduced motion. */
let lenisAktif: Lenis | null = null;

/** Gulir ke bagian tertentu. Pakai Lenis bila aktif, selain itu scroll native. */
export function gulirKe(id: string, offset = -72): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenisAktif) {
    lenisAktif.scrollTo(el, { offset, duration: 1.2 });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

export function useLenis(): void {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenisAktif = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisAktif = null;
    };
  }, []);
}

interface OpsiTilt {
  maks?: number;
  angkat?: boolean;
}

/**
 * Kartu miring 3D yang mengikuti kursor (perspective 900px). Mati di layar sentuh
 * dan saat reduced motion. Kilau `.kilau` mengikuti kursor lewat CSS var.
 */
export function useTilt<T extends HTMLElement>(ref: RefObject<T | null>, opsi: OpsiTilt = {}): void {
  const { maks = 12, angkat = true } = opsi;
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || isCoarsePointer()) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotateY: x * maks * 2, rotateX: -y * maks * 2, transformPerspective: 900, duration: 0.5, ease: "power3.out" });
      el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
      el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
    };
    const onEnter = () => {
      if (angkat) gsap.to(el, { y: -6, duration: 0.4, ease: "power2.out" });
    };
    const onLeave = () => {
      gsap.to(el, { rotateX: 0, rotateY: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.6)" });
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [ref, maks, angkat]);
}

/**
 * Tombol magnetik: bergeser mengikuti kursor di dalam radius 60px dengan kekuatan
 * 0.3; teks di `[data-magnetic-inner]` bergeser lebih jauh. Klik memunculkan riak.
 */
export function useMagnetic<T extends HTMLElement>(ref: RefObject<T | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || isCoarsePointer()) return;
    const inner = el.querySelector<HTMLElement>("[data-magnetic-inner]");

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dekat = Math.abs(dx) < r.width / 2 + 60 && Math.abs(dy) < r.height / 2 + 60;
      if (!dekat) {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
        if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
        return;
      }
      gsap.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.4, ease: "power3.out" });
      if (inner) gsap.to(inner, { x: dx * 0.15, y: dy * 0.15, duration: 0.4, ease: "power3.out" });
    };
    const onClick = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const riak = document.createElement("span");
      riak.className = "riak";
      riak.style.left = `${e.clientX - r.left}px`;
      riak.style.top = `${e.clientY - r.top}px`;
      riak.style.width = "20px";
      riak.style.height = "20px";
      el.appendChild(riak);
      gsap.to(riak, { scale: 6, opacity: 0, duration: 0.7, ease: "power2.out", onComplete: () => riak.remove() });
    };

    window.addEventListener("pointermove", onMove);
    el.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("click", onClick);
    };
  }, [ref]);
}

/**
 * Animasi masuk saat section masuk viewport (sekali saja). Di reduced motion,
 * konten langsung tampil tanpa animasi.
 */
export function useReveal(
  scope: RefObject<HTMLElement | null>,
  selector: string,
  dari: gsap.TweenVars,
  ke: gsap.TweenVars,
  delay = 0
): void {
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const targets = el.querySelectorAll(selector);
      if (targets.length === 0) return;
      gsap.fromTo(targets, dari, {
        ...ke,
        delay,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
