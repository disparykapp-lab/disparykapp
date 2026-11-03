import type { HasilChat, HasilPetunjuk } from "./api";

export const PESAN_PETUNJUK: Record<Exclude<HasilPetunjuk, "ok">, string> = {
  kosong: "Tulis 1 kata petunjuk dulu.",
  panjang: "Petunjuk maksimal 24 huruf.",
  satu_kata: "Petunjuk harus 1 kata (tanpa spasi).",
  sama_kata: "Jangan sebut katamu sendiri!",
  kasar: "Petunjuk itu mengandung kata yang tidak pantas.",
  bukan_giliran: "Belum giliranmu.",
  tutup: "Waktu giliranmu sudah habis.",
};

export const PESAN_CHAT: Record<Exclude<HasilChat, "ok">, string> = {
  kosong: "Tulis pesan dulu.",
  tutup: "Diskusi sudah selesai.",
  tersingkir: "Pemain yang tersingkir tidak bisa ikut diskusi.",
  terlalu_cepat: "Pelan-pelan, tunggu sebentar sebelum mengirim lagi.",
  kasar: "Pesan itu mengandung kata yang tidak pantas.",
};
