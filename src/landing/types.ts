// Bentuk isi setiap bagian landing. Disimpan sebagai JSON di tabel landing_konten.

/** Nama ikon yang dikenali (dipetakan ke lucide-react di landing/ikon.tsx). */
export type NamaIkon =
  | "umbrella" | "mountain" | "building" | "compass" | "leaf" | "palmtree"
  | "users" | "heart" | "camera" | "utensils" | "luggage" | "landmark" | "ticket" | "trees";

export interface ItemNavbar {
  label: string;
  /** id bagian tujuan di halaman, mis. "destinasi" */
  target: string;
}

export interface IsiNavbar {
  logo: string;
  menu: ItemNavbar[];
  tombolMasuk: string;
  tombolDaftar: string;
}

export interface IsiHero {
  eyebrow: string;
  /** Satu baris per judul (pisah dengan enter). */
  judul: string;
  subjudul: string;
  placeholderCari: string;
  foto: string;
  captionLokasi: string;
  captionKalimat: string;
}

export interface IsiKategori {
  items: { label: string; icon: NamaIkon; id: string }[];
}

export interface ItemDestinasi {
  id: string;
  nama: string;
  negara: string;
  tagline: string;
  foto: string;
  /** id kategori (lihat kategori) untuk fitur filter */
  tags: string[];
  /** Isi halaman detail `/destinasi/:id`. Kosong = memakai teks bawaan (bila ada) atau tagline. */
  deskripsi?: string;
  aktivitas?: AktivitasDestinasi[];
  tips?: string;
}

export interface AktivitasDestinasi {
  icon: NamaIkon;
  judul: string;
  teks: string;
}

export interface IsiDestinasi {
  judul: string;
  subjudul: string;
  tautanLabel: string;
  items: ItemDestinasi[];
}

export interface IsiGaya {
  judul: string;
  subjudul: string;
  items: { id: string; label: string; icon: NamaIkon }[];
}

export interface ItemPaket {
  id: string;
  judul: string;
  deskripsi: string;
  negara: string;
  durasi: number;
  harga: string;
  foto: string;
  /** id gaya perjalanan yang cocok */
  gaya: string[];
}

export interface IsiPaket {
  judul: string;
  subjudul: string;
  tautanLabel: string;
  items: ItemPaket[];
}

export interface ItemBerita {
  id: string;
  judul: string;
  ringkasan: string;
  tanggal: string;
  foto: string;
  tautan: string;
}

export interface IsiBerita {
  judul: string;
  subjudul: string;
  items: ItemBerita[];
}

export interface ItemTestimoni {
  id: string;
  nama: string;
  asal: string;
  kutipan: string;
  foto: string;
}

export interface IsiTestimoni {
  judul: string;
  subjudul: string;
  items: ItemTestimoni[];
}

export interface IsiNewsletter {
  eyebrow: string;
  judul: string;
  teks: string;
  placeholder: string;
  tombol: string;
  catatanPrivasi: string;
  foto: string;
}

export interface IsiFooter {
  tagline: string;
  kolom: { judul: string; tautan: string[] }[];
  sosial: { nama: string; url: string }[];
  hak: string;
}

export interface Isi {
  navbar: IsiNavbar;
  hero: IsiHero;
  kategori: IsiKategori;
  destinasi: IsiDestinasi;
  gaya: IsiGaya;
  paket: IsiPaket;
  berita: IsiBerita;
  testimoni: IsiTestimoni;
  newsletter: IsiNewsletter;
  footer: IsiFooter;
}

export type KunciLanding = keyof Isi;

export const SEMUA_KUNCI: KunciLanding[] = [
  "navbar", "hero", "kategori", "destinasi", "gaya", "paket", "berita", "testimoni", "newsletter", "footer",
];

/** Bagian yang sengaja disembunyikan dulu sampai admin mengisi konten aslinya. */
export const TAMPIL_BAWAAN: Record<KunciLanding, boolean> = {
  navbar: true,
  hero: true,
  kategori: true,
  destinasi: true,
  gaya: true,
  paket: false,
  berita: false,
  testimoni: false,
  newsletter: true,
  footer: true,
};
