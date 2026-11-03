import type { NamaIkon } from "./aset";

export interface Kategori {
  id: string;
  nama: string;
  ikon: NamaIkon;
}

// id harus sama dengan penyusup_kategori.id di database (dari Referensi/bank_kata.json)
export const DAFTAR_KATEGORI: Kategori[] = [
  { id: "wisata_jogja", nama: "Destinasi Wisata", ikon: "pemandu" },
  { id: "kuliner", nama: "Kuliner", ikon: "poin" },
  { id: "budaya", nama: "Seni & Budaya", ikon: "penyusup" },
  { id: "kantor_magang", nama: "Dunia Magang", ikon: "absensi" },
  { id: "pariwisata_umum", nama: "Pariwisata", ikon: "kartu_kata" },
];
