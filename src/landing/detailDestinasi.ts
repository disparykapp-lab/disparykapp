import type { AktivitasDestinasi, ItemDestinasi } from "./types";

// Teks bawaan halaman detail untuk 6 destinasi awal. Admin bisa mengubahnya di
// Kelola → Landing Page → Destinasi populer. Destinasi yang disimpan sebelum
// field detail ada tetap mendapat teks ini lewat lengkapiDetail().

export interface DetailDestinasi {
  deskripsi: string;
  aktivitas: AktivitasDestinasi[];
  tips?: string;
}

export const DETAIL_BAWAAN: Record<string, DetailDestinasi> = {
  malioboro: {
    deskripsi:
      "Malioboro adalah jantung Kota Yogyakarta. Jalan yang membentang dari kawasan Tugu hingga Titik Nol Kilometer ini dipenuhi pedagang batik, kerajinan, dan kuliner kaki lima. Menjelang malam, musisi jalanan dan lampu kota membuat suasananya makin hidup.",
    aktivitas: [
      { icon: "luggage", judul: "Belanja oleh-oleh", teks: "Batik, kaos, perak, dan kerajinan khas Jogja di sepanjang jalan." },
      { icon: "utensils", judul: "Kuliner malam", teks: "Gudeg, angkringan, dan lesehan yang buka sampai larut." },
      { icon: "camera", judul: "Jalan ke Titik Nol", teks: "Berakhir di bangunan kolonial dan alun-alun dekat Keraton." },
    ],
    tips: "Datang sore hari agar sempat menikmati suasana siang dan malam sekaligus.",
  },
  keraton: {
    deskripsi:
      "Keraton Ngayogyakarta Hadiningrat adalah istana Kesultanan Yogyakarta yang berdiri sejak abad ke-18 dan masih menjadi tempat tinggal Sultan. Kompleksnya menyimpan pusaka, gamelan, dan arsitektur Jawa yang sarat makna filosofis.",
    aktivitas: [
      { icon: "landmark", judul: "Museum Keraton", teks: "Koleksi pusaka, kereta, dan busana keluarga kerajaan." },
      { icon: "ticket", judul: "Pertunjukan seni", teks: "Gamelan, tari klasik, dan wayang pada jadwal tertentu." },
      { icon: "camera", judul: "Arsitektur Jawa", teks: "Pendopo, bangsal, dan tata ruang sumbu filosofi Jogja." },
    ],
    tips: "Kenakan pakaian sopan dan ikuti pemandu untuk memahami cerita di balik tiap bangunan.",
  },
  tamansari: {
    deskripsi:
      "Taman Sari dibangun pada masa Sultan Hamengku Buwono I sebagai taman dan tempat peristirahatan keluarga istana. Kolam pemandian, lorong bawah tanah, dan Sumur Gumuling menjadikannya salah satu sudut paling fotogenik di Jogja.",
    aktivitas: [
      { icon: "camera", judul: "Umbul Pasiraman", teks: "Kolam pemandian berarsitektur campuran Jawa dan Eropa." },
      { icon: "compass", judul: "Sumur Gumuling", teks: "Bangunan melingkar dengan tangga di tengah yang ikonik." },
      { icon: "users", judul: "Kampung wisata", teks: "Gang-gang permukiman dengan mural dan kerajinan warga." },
    ],
  },
  prambanan: {
    deskripsi:
      "Candi Prambanan adalah kompleks candi Hindu terbesar di Indonesia yang dibangun pada abad ke-9 dan diakui sebagai Warisan Dunia UNESCO. Tiga candi utamanya menjulang tinggi, dan di malam tertentu menjadi latar pertunjukan Sendratari Ramayana.",
    aktivitas: [
      { icon: "landmark", judul: "Candi Siwa", teks: "Candi utama setinggi puluhan meter dengan relief Ramayana." },
      { icon: "ticket", judul: "Sendratari Ramayana", teks: "Pertunjukan tari dengan latar candi saat malam." },
      { icon: "camera", judul: "Senja di candi", teks: "Siluet candi saat matahari terbenam yang memukau." },
    ],
    tips: "Datang pagi untuk udara yang lebih sejuk dan suasana yang lebih tenang.",
  },
  kaliurang: {
    deskripsi:
      "Kaliurang adalah kawasan wisata sejuk di lereng selatan Gunung Merapi. Hutan pinus, jalur trekking, dan panorama Merapi di pagi hari menjadikannya tempat favorit untuk melepas penat dari keramaian kota.",
    aktivitas: [
      { icon: "compass", judul: "Lava tour", teks: "Naik jip menyusuri jejak erupsi Merapi." },
      { icon: "trees", judul: "Hutan & trekking", teks: "Jalur hijau dengan udara pegunungan yang segar." },
      { icon: "utensils", judul: "Jadah tempe", teks: "Camilan khas Kaliurang yang wajib dicoba." },
    ],
    tips: "Bawa jaket. Pantau status Merapi dari sumber resmi sebelum berangkat.",
  },
  parangtritis: {
    deskripsi:
      "Parangtritis adalah pantai paling terkenal di pesisir selatan Yogyakarta, lekat dengan legenda Ratu Pantai Selatan. Hamparan pasir luas dan langit senja menjadikannya tempat terbaik menutup hari.",
    aktivitas: [
      { icon: "umbrella", judul: "Matahari terbenam", teks: "Langit jingga di garis Samudra Hindia." },
      { icon: "compass", judul: "Andong & ATV", teks: "Menyusuri bibir pantai dengan cara yang seru." },
      { icon: "mountain", judul: "Gumuk pasir", teks: "Bukit pasir Parangkusumo yang langka di Asia Tenggara." },
    ],
    tips: "Ombak selatan besar dan berbahaya. Hindari berenang dan patuhi rambu petugas.",
  },
};

/** Isi field detail yang belum pernah disimpan (undefined) dengan teks bawaan. */
export function lengkapiDetail(item: ItemDestinasi): ItemDestinasi {
  const b = DETAIL_BAWAAN[item.id];
  return {
    ...item,
    deskripsi: item.deskripsi ?? b?.deskripsi ?? "",
    aktivitas: item.aktivitas ?? b?.aktivitas ?? [],
    tips: item.tips ?? b?.tips ?? "",
  };
}
