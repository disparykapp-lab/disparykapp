import type { NamaIkon } from "./aset";

export interface Kategori {
  id: string;
  nama: string;
  ikon: NamaIkon;
}

// id harus sama dengan penyusup_kategori.id yang aktif di database
// (migrasi 0034: benda & tempat sehari-hari yang dikenal di semua daerah)
export const DAFTAR_KATEGORI: Kategori[] = [
  { id: "makanan", nama: "Makanan & Minuman", ikon: "poin" },
  { id: "benda_rumah", nama: "Benda di Rumah", ikon: "kunci" },
  { id: "hewan", nama: "Hewan", ikon: "pemain" },
  { id: "tempat", nama: "Tempat", ikon: "pemandu" },
  { id: "kantor_sekolah", nama: "Kantor & Sekolah", ikon: "absensi" },
  { id: "kendaraan", nama: "Kendaraan", ikon: "main" },
];
