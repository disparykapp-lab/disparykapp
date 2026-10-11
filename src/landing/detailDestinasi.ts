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
  beringharjo: {
    deskripsi:
      "Pasar Beringharjo adalah salah satu pasar tradisional tertua di Yogyakarta, berdiri sejak 1925 di ujung selatan Malioboro. Lantai dasarnya dipenuhi kios batik dan kain, sementara los belakang terkenal dengan jamu racikan tradisional.",
    aktivitas: [
      { icon: "luggage", judul: "Belanja batik", teks: "Ratusan kios batik dan kain dengan harga bisa ditawar." },
      { icon: "leaf", judul: "Jamu gendong", teks: "Racikan jamu tradisional segar dari los jamu." },
      { icon: "utensils", judul: "Kuliner pasar", teks: "Jajanan pasar khas Jogja di lantai dasar." },
    ],
    tips: "Datang pagi hari untuk suasana pasar yang lebih segar dan tidak terlalu ramai.",
  },
  vredeburg: {
    deskripsi:
      "Benteng Vredeburg awalnya dibangun Belanda untuk mengawasi Keraton, kini menjadi museum sejarah perjuangan kemerdekaan dengan diorama dan koleksi benda bersejarah, persis di seberang Istana Kepresidenan Gedung Agung.",
    aktivitas: [
      { icon: "camera", judul: "Diorama sejarah", teks: "Rangkaian diorama perjalanan kemerdekaan Indonesia." },
      { icon: "landmark", judul: "Arsitektur benteng", teks: "Bastion dan parit khas benteng peninggalan kolonial." },
      { icon: "ticket", judul: "Pameran temporer", teks: "Ruang pamer yang kerap menggelar acara seni dan budaya." },
    ],
    tips: "Letaknya persis di ujung selatan Malioboro, gampang dijangkau jalan kaki.",
  },
  tamanpintar: {
    deskripsi:
      "Taman Pintar adalah wahana wisata edukasi di tengah kota, berisi alat peraga sains interaktif, planetarium, dan area bermain yang dirancang untuk menumbuhkan rasa ingin tahu anak-anak.",
    aktivitas: [
      { icon: "compass", judul: "Alat peraga sains", teks: "Puluhan wahana interaktif yang bisa dicoba langsung." },
      { icon: "camera", judul: "Planetarium", teks: "Pertunjukan simulasi langit dan luar angkasa." },
      { icon: "users", judul: "Area kreativitas", teks: "Zona kerajinan dan edukasi untuk anak usia dini." },
    ],
    tips: "Siapkan waktu minimal 2-3 jam karena wahananya cukup banyak.",
  },
  alunalunkidul: {
    deskripsi:
      "Alun-Alun Kidul (Alkid) adalah lapangan di sisi selatan Keraton yang ramai menjelang malam — sepeda hias berlampu, angkringan, dan mitos masangin (berjalan lurus dengan mata tertutup di antara dua pohon beringin) jadi daya tariknya.",
    aktivitas: [
      { icon: "compass", judul: "Sepeda hias", teks: "Keliling alun-alun dengan sepeda berlampu warna-warni." },
      { icon: "camera", judul: "Masangin", teks: "Mitos berjalan lurus mata tertutup di antara dua beringin kembar." },
      { icon: "utensils", judul: "Kuliner malam", teks: "Angkringan dan jajanan kaki lima di sekelilingnya." },
    ],
    tips: "Paling hidup mulai petang hingga malam hari.",
  },
  prawirotaman: {
    deskripsi:
      "Prawirotaman mulai dikenal sebagai kawasan turis sejak era backpacker 1970-an. Kini jalan-jalannya dipenuhi kafe, toko suvenir, galeri seni, dan penginapan dengan suasana yang santai dan ramah pejalan kaki.",
    aktivitas: [
      { icon: "utensils", judul: "Kafe & kuliner", teks: "Beragam kafe dan restoran dengan suasana santai." },
      { icon: "luggage", judul: "Belanja suvenir", teks: "Toko batik, kerajinan, dan oleh-oleh khas." },
      { icon: "compass", judul: "Jalan kaki santai", teks: "Gang-gang kampung yang nyaman dijelajahi tanpa kendaraan." },
    ],
    tips: "Cocok untuk jalan kaki sore sambil mampir dari satu kafe ke kafe lain.",
  },
  kotabaru: {
    deskripsi:
      "Kotabaru adalah permukiman bergaya kota taman peninggalan kolonial Belanda yang dibangun awal abad ke-20, kini jadi kawasan cagar budaya dengan deretan rumah tua, gereja, dan museum.",
    aktivitas: [
      { icon: "trees", judul: "Jalan kaki & sepeda", teks: "Menyusuri jalan-jalan rindang berisi rumah-rumah tua." },
      { icon: "landmark", judul: "Gereja heritage", teks: "Bangunan ibadah bersejarah dengan arsitektur kolonial." },
      { icon: "utensils", judul: "Kafe & resto heritage", teks: "Beberapa rumah tua kini beralih fungsi jadi kafe dan restoran." },
    ],
    tips: "Nikmati suasananya pagi atau sore hari saat udara masih sejuk.",
  },
  pakualaman: {
    deskripsi:
      "Puro Pakualaman adalah kediaman resmi Adipati Paku Alam, pemimpin Kadipaten Pakualaman yang berdiri sejak 1813. Kompleksnya menyimpan koleksi pusaka dan arsitektur Jawa yang masih terawat.",
    aktivitas: [
      { icon: "landmark", judul: "Bangsal pendopo", teks: "Arsitektur Jawa klasik tempat upacara adat digelar." },
      { icon: "camera", judul: "Koleksi pusaka", teks: "Benda-benda bersejarah milik Kadipaten Pakualaman." },
      { icon: "compass", judul: "Perpustakaan Puro", teks: "Koleksi naskah kuno dan literatur budaya Jawa." },
    ],
    tips: "Kunjungan biasanya mengikuti jadwal/izin tertentu — cek dulu sebelum datang.",
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
