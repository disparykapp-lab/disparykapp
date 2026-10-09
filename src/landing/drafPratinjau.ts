import type { LandingTergabung } from "../lib/landing";

// Pratinjau di Kelola → Landing Page: halaman admin memuat landing di iframe
// (asal yang sama) dan menaruh draf di window.__pratinjauLanding. Landing di
// dalam iframe membaca draf itu, bukan data server, lalu ikut berubah setiap
// admin mengetik (diberi tahu lewat postMessage).

declare global {
  interface Window {
    __pratinjauLanding?: LandingTergabung;
  }
}

export const PESAN_PRATINJAU = "disparyk:pratinjau-landing";

export interface PesanPratinjau {
  tipe: typeof PESAN_PRATINJAU;
  /** id section yang perlu digulir (mis. "destinasi"), opsional */
  gulir?: string;
}

/** Draf dari halaman admin induk, atau null kalau bukan sedang dipratinjau. */
export function drafPratinjau(): LandingTergabung | null {
  try {
    if (window.parent === window) return null;
    return window.parent.__pratinjauLanding ?? null;
  } catch {
    return null;
  }
}
