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
  kotagede: {
    deskripsi:
      "Kotagede adalah bekas pusat Kerajaan Mataram Islam yang kini dikenal sebagai sentra kerajinan perak. Gang-gang sempitnya menyimpan rumah joglo tua, bekas benteng keraton, dan bengkel perak turun-temurun.",
    aktivitas: [
      { icon: "camera", judul: "Rumah joglo tua", teks: "Arsitektur Jawa kuno yang sebagian masih dihuni warga." },
      { icon: "luggage", judul: "Belanja perak", teks: "Perhiasan dan suvenir perak buatan tangan pengrajin lokal." },
      { icon: "landmark", judul: "Situs Mataram Islam", teks: "Jejak bekas keraton dan makam raja-raja Mataram." },
    ],
    tips: "Jelajahi gang-gang kecilnya dengan jalan kaki untuk menemukan sudut-sudut bersejarah.",
  },
  gembiraloka: {
    deskripsi:
      "Kebun Binatang Gembira Loka adalah taman konservasi satwa di tengah Kota Yogyakarta, jadi tujuan wisata keluarga sekaligus sarana edukasi tentang keragaman hayati.",
    aktivitas: [
      { icon: "camera", judul: "Melihat satwa", teks: "Ratusan jenis satwa dari berbagai belahan dunia." },
      { icon: "users", judul: "Wisata keluarga", teks: "Wahana dan area bermain yang ramah anak." },
      { icon: "trees", judul: "Susur perahu", teks: "Menyusuri danau buatan di tengah taman." },
    ],
    tips: "Datang pagi hari supaya lebih sejuk dan satwa lebih aktif.",
  },
  tugujogja: {
    deskripsi:
      "Tugu Yogyakarta adalah monumen ikonik penanda jantung Kota Yogyakarta, berdiri di persimpangan jalan yang selalu ramai dan jadi latar foto favorit wisatawan.",
    aktivitas: [
      { icon: "camera", judul: "Foto ikonik", teks: "Salah satu spot foto paling dicari di Yogyakarta." },
      { icon: "utensils", judul: "Kuliner sekitar", teks: "Angkringan dan kafe di sekitar kawasan Tugu." },
      { icon: "compass", judul: "Sumbu filosofi", teks: "Titik utara garis imajiner Tugu–Keraton–Laut Selatan." },
    ],
    tips: "Paling ramai dan fotogenik saat malam hari dengan lampu kota.",
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
