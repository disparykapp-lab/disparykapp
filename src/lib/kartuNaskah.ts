// Isi & tata letak kartu gambar "Bagikan hasil" Naskah AI (murni, tanpa DOM).
// Penggambarannya di gambarNaskah.ts.
import { pecahPertanyaan, tanpaMarkdown } from "./naskahAiTeks.ts";

/** Watermark di kaki kartu (pilihan admin: logo + label, tanpa nama orang). */
export const MEREK_KARTU = "Naskah AI · Dinas Pariwisata Kota Yogyakarta";

const LABEL_NASKAH: Record<string, string> = {
  berita: "Berita",
  siaran_pers: "Siaran pers",
  caption: "Caption",
  voice_over: "Voice-over",
};
const LABEL_WAWANCARA: Record<string, string> = { formal: "Formal", santai: "Santai" };

export function labelGayaNaskah(tipe: string, gaya: string): string {
  if (tipe === "pertanyaan") return `Wawancara · ${LABEL_WAWANCARA[gaya] ?? "Formal"}`;
  return LABEL_NASKAH[gaya] ?? "Naskah";
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2026-11-16" → "16 November 2026"; selain format itu dikembalikan apa adanya. */
export function formatTanggalPanjang(tgl: string): string {
  const m = tgl.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return tgl;
  const bulan = BULAN[Number(m[2]) - 1];
  return bulan ? `${Number(m[3])} ${bulan} ${m[1]}` : tgl;
}

/** Satu blok isi: paragraf biasa (null = jeda antar paragraf) atau pertanyaan bernomor. */
export type BlokKartu = { jenis: "teks"; teks: string } | { jenis: "jeda" } | { jenis: "nomor"; no: number; teks: string };

export interface IsiKartu {
  label: string;
  judul: string | null;
  meta: string | null;
  blok: BlokKartu[];
}

interface SumberKartu {
  tipe: string;
  gaya: string;
  nama_acara: string | null;
  jenis_acara: string | null;
  lokasi: string | null;
  tanggal: string | null;
  hasil: string;
}

function blokTeks(teks: string): BlokKartu[] {
  const blok: BlokKartu[] = [];
  for (const baris of teks.split("\n")) {
    const t = baris.trim();
    if (t) blok.push({ jenis: "teks", teks: t });
    else if (blok.length && blok[blok.length - 1].jenis !== "jeda") blok.push({ jenis: "jeda" });
  }
  while (blok.length && blok[blok.length - 1].jenis === "jeda") blok.pop();
  return blok;
}

export function isiKartuNaskah(h: SumberKartu): IsiKartu {
  const judul = h.nama_acara?.trim() || h.jenis_acara?.trim() || null;
  const meta = [h.lokasi?.trim(), h.tanggal ? formatTanggalPanjang(h.tanggal) : null].filter(Boolean).join(" · ") || null;

  let blok: BlokKartu[];
  const pecah = h.tipe === "pertanyaan" ? pecahPertanyaan(h.hasil) : null;
  if (pecah) {
    blok = [];
    if (pecah.pembuka) blok.push(...blokTeks(pecah.pembuka), { jenis: "jeda" });
    pecah.daftar.forEach((teks, i) => {
      if (i > 0) blok.push({ jenis: "jeda" });
      blok.push({ jenis: "nomor", no: i + 1, teks });
    });
    if (pecah.penutup) blok.push({ jenis: "jeda" }, ...blokTeks(pecah.penutup));
  } else {
    blok = blokTeks(tanpaMarkdown(h.hasil));
  }
  return { label: labelGayaNaskah(h.tipe, h.gaya), judul, meta, blok };
}

/**
 * Pecah teks jadi baris yang muat di `lebar` (diukur `ukur`). Kata yang lebih
 * panjang dari satu baris (mis. tautan) dipotong per huruf.
 */
export function bungkusTeks(teks: string, lebar: number, ukur: (s: string) => number): string[] {
  const baris: string[] = [];
  let kini = "";
  for (const kata of teks.split(/\s+/).filter(Boolean)) {
    const coba = kini ? `${kini} ${kata}` : kata;
    if (ukur(coba) <= lebar) {
      kini = coba;
      continue;
    }
    if (kini) baris.push(kini);
    if (ukur(kata) <= lebar) {
      kini = kata;
      continue;
    }
    // kata kepanjangan: potong per huruf (Array.from supaya emoji tidak terbelah)
    kini = "";
    for (const huruf of Array.from(kata)) {
      if (kini && ukur(kini + huruf) > lebar) {
        baris.push(kini);
        kini = huruf;
      } else kini += huruf;
    }
  }
  if (kini) baris.push(kini);
  return baris;
}

/** Ukuran huruf isi: makin panjang naskahnya, makin kecil (tetap terbaca di HP). */
export function ukuranHurufIsi(blok: BlokKartu[]): number {
  const panjang = blok.reduce((n, b) => n + (b.jenis === "jeda" ? 0 : b.teks.length), 0);
  return panjang <= 700 ? 38 : panjang <= 1600 ? 34 : 30;
}

/** "naskah-festival-kuliner-malioboro.png" */
export function namaBerkasNaskah(h: { tipe: string; nama_acara: string | null; jenis_acara: string | null }): string {
  const awal = h.tipe === "pertanyaan" ? "pertanyaan" : "naskah";
  const slug = (h.nama_acara || h.jenis_acara || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return `${awal}${slug ? `-${slug}` : ""}.png`;
}
