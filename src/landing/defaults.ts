import type { Isi } from "./types";
import { lengkapiDetail } from "./detailDestinasi";

// Isi awal sebelum admin mengubah apa pun. Semua teks bisa diganti dari
// Kelola → Landing Page. Paket perjalanan dan testimoni sengaja kosong/disembunyikan
// karena belum ada data nyata; jangan diisi testimoni fiktif.

export const BAWAAN: Isi = {
  navbar: {
    logo: "DisparYK",
    menu: [
      { label: "Destinasi", target: "destinasi" },
      { label: "Gaya Wisata", target: "gaya" },
      { label: "Berita", target: "berita" },
      { label: "Agenda", target: "agenda" },
    ],
    tombolMasuk: "Masuk",
    tombolDaftar: "Daftar",
  },
  hero: {
    eyebrow: "JOGJA. ISTIMEWA. BERSAMA.",
    judul: "Jelajahi\nYogyakarta\nIstimewa",
    subjudul: "Informasi wisata, event, dan layanan Dinas Pariwisata Kota Yogyakarta dalam satu tempat.",
    placeholderCari: "Mau ke mana hari ini?",
    foto: "",
    captionLokasi: "Yogyakarta, Indonesia",
    captionKalimat: "Kota budaya yang selalu menyambut.",
  },
  kategori: {
    items: [
      { id: "budaya", label: "Budaya", icon: "landmark" },
      { id: "alam", label: "Alam", icon: "mountain" },
      { id: "kota", label: "Kota", icon: "building" },
      { id: "event", label: "Event", icon: "ticket" },
      { id: "berkelanjutan", label: "Berkelanjutan", icon: "leaf" },
    ],
  },
  destinasi: {
    judul: "Destinasi Populer",
    subjudul: "Tempat-tempat ikonik untuk dikunjungi di Kota Yogyakarta.",
    tautanLabel: "Lihat Semua Destinasi",
    items: ([
      { id: "malioboro", nama: "Malioboro", negara: "Yogyakarta", tagline: "Jalan legendaris penuh kuliner dan kerajinan", foto: "", tags: ["kota", "budaya"] },
      { id: "keraton", nama: "Keraton", negara: "Yogyakarta", tagline: "Pusat budaya dan tradisi Kesultanan", foto: "", tags: ["budaya"] },
      { id: "tamansari", nama: "Taman Sari", negara: "Yogyakarta", tagline: "Bekas taman istana dengan sejarah yang kaya", foto: "", tags: ["budaya", "kota"] },
      { id: "prambanan", nama: "Prambanan", negara: "Sleman", tagline: "Kompleks candi Hindu yang megah", foto: "", tags: ["budaya", "event"] },
      { id: "kaliurang", nama: "Kaliurang", negara: "Sleman", tagline: "Udara sejuk di lereng Gunung Merapi", foto: "", tags: ["alam", "berkelanjutan"] },
      { id: "parangtritis", nama: "Parangtritis", negara: "Bantul", tagline: "Pantai selatan dengan pemandangan matahari terbenam", foto: "", tags: ["alam", "event"] },
    ]).map(lengkapiDetail),
  },
  gaya: {
    judul: "Sesuai Gaya Wisatamu",
    subjudul: "Temukan pengalaman yang cocok dengan caramu berwisata.",
    items: [
      { id: "santai", label: "Santai", icon: "palmtree" },
      { id: "petualangan", label: "Petualangan", icon: "compass" },
      { id: "keluarga", label: "Keluarga", icon: "users" },
      { id: "bulanmadu", label: "Bulan Madu", icon: "heart" },
      { id: "berkelanjutan", label: "Berkelanjutan", icon: "leaf" },
      { id: "budaya", label: "Wisata Budaya", icon: "camera" },
      { id: "kuliner", label: "Kuliner", icon: "utensils" },
      { id: "solo", label: "Solo", icon: "luggage" },
    ],
  },
  paket: {
    judul: "Agenda Unggulan",
    subjudul: "Pilihan itinerary untuk perjalanan yang berkesan.",
    tautanLabel: "Lihat Semua Agenda",
    items: [],
  },
  berita: {
    judul: "Berita Terkini",
    subjudul: "Kabar terbaru dari Dinas Pariwisata Kota Yogyakarta.",
    items: [],
  },
  testimoni: {
    judul: "Kata Mereka",
    subjudul: "Cerita dari pengunjung.",
    items: [],
  },
  newsletter: {
    eyebrow: "TETAP TERINSPIRASI",
    judul: "Dapatkan Info Wisata di Inbox Kamu",
    teks: "Event, tips, dan destinasi terbaru Kota Yogyakarta.",
    placeholder: "Masukkan alamat email",
    tombol: "Langganan",
    catatanPrivasi: "Kami menghargai privasi kamu. Berhenti berlangganan kapan saja.",
    foto: "",
  },
  footer: {
    tagline: "Jelajahi Yogyakarta dengan cara yang lebih dekat dan bermakna.",
    kolom: [
      { judul: "Jelajah", tautan: ["Destinasi", "Event", "Panduan Wisata"] },
      { judul: "Dinas", tautan: ["Tentang Kami", "Program", "Kontak"] },
      { judul: "Bantuan", tautan: ["Pusat Bantuan", "Hubungi Kami"] },
    ],
    sosial: [
      { nama: "Instagram", url: "" },
      { nama: "Facebook", url: "" },
      { nama: "YouTube", url: "" },
    ],
    hak: "Dinas Pariwisata Kota Yogyakarta. Hak cipta dilindungi.",
  },
};
