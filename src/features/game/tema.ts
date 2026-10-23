import { ASET } from "./assets";

export interface Tema {
  id: string;
  label: string;
  gambar: string;
  warna: string;
}

// id harus sama dengan kolom game_kata.tema di database
export const DAFTAR_TEMA: Tema[] = [
  { id: "umum", label: "Umum", gambar: ASET.item.tas, warna: "#8FC9F2" },
  { id: "jogja", label: "Jogja", gambar: ASET.tema.tugu, warna: "#FCE7A8" },
  { id: "kuliner", label: "Kuliner", gambar: ASET.item.gudeg, warna: "#F8C9A8" },
  { id: "hewan", label: "Hewan", gambar: ASET.tema.hewan, warna: "#BFE5CC" },
  { id: "wisata", label: "Wisata", gambar: ASET.tema.candi, warna: "#C7E3F7" },
  { id: "kantor", label: "Kantor", gambar: ASET.tema.kantor, warna: "#E4DFD6" },
  { id: "aktivitas", label: "Aktivitas", gambar: ASET.item.becak, warna: "#F6C3C4" },
];

export function temaById(id: string): Tema {
  return DAFTAR_TEMA.find((t) => t.id === id) ?? DAFTAR_TEMA[0];
}
