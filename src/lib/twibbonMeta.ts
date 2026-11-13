// Aturan file twibbon — tanpa dependensi supaya bisa diuji langsung (npm test).

/**
 * Contoh twibbon (bingkai lama aplikasi) — hanya untuk diunduh/dipakai admin sebagai
 * template. Bawaannya kamera absen TANPA twibbon sampai admin memasang satu.
 */
export const TWIBBON_CONTOH = "/twibbon.png";

/**
 * Ketentuan ukuran twibbon. Kamera absen memakai area pratinjau 3:4 potret dan
 * menggambar bingkai memenuhi seluruh foto (sisi terpanjang foto maks. 900 px),
 * jadi gambar di luar rasio 3:4 akan terlihat gepeng/melar.
 */
export const KETENTUAN_TWIBBON = {
  lebarSaran: 1080,
  tinggiSaran: 1440,
  lebarMin: 600,
  tinggiMin: 800,
  rasio: 3 / 4,
  /** Selisih rasio yang masih diterima (contoh 1000 × 1350 ≈ 1,2%). */
  toleransiRasio: 0.03,
  ukuranMaksByte: 2 * 1024 * 1024,
  tipe: "image/png",
  /** Area wajah (proporsi gambar) yang harus tembus pandang. */
  areaWajah: { x1: 0.3, x2: 0.7, y1: 0.25, y2: 0.65 },
  /** Minimal bagian area wajah yang tembus pandang. */
  wajahTembusMin: 0.9,
} as const;

export function formatUkuranFile(byte: number): string {
  if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024))} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Cek tipe, ukuran file, resolusi, dan rasio. Kosong = lolos. */
export function cekFileTwibbon(info: { tipe: string; ukuranByte: number; lebar: number; tinggi: number }): string[] {
  const k = KETENTUAN_TWIBBON;
  const masalah: string[] = [];
  if (info.tipe !== k.tipe) masalah.push("Format harus PNG supaya bagian tengahnya bisa transparan.");
  if (info.ukuranByte > k.ukuranMaksByte) {
    masalah.push(`Ukuran file ${formatUkuranFile(info.ukuranByte)}, maksimal ${formatUkuranFile(k.ukuranMaksByte)}.`);
  }
  if (info.lebar < k.lebarMin || info.tinggi < k.tinggiMin) {
    masalah.push(`Resolusi ${info.lebar} × ${info.tinggi} px terlalu kecil, minimal ${k.lebarMin} × ${k.tinggiMin} px.`);
  }
  if (info.lebar > 0 && info.tinggi > 0) {
    const selisih = Math.abs(info.lebar / info.tinggi - k.rasio) / k.rasio;
    if (selisih > k.toleransiRasio) {
      masalah.push(
        `Rasio ${info.lebar} × ${info.tinggi} px bukan 3:4 potret, nanti bingkainya gepeng/melar. ` +
          `Contoh ukuran yang benar: ${k.lebarSaran} × ${k.tinggiSaran} px.`
      );
    }
  }
  return masalah;
}

/**
 * Hitung bagian gambar yang tembus pandang (alpha < 128) dari data RGBA
 * (hasil getImageData). `wajah` = di area wajah, `ornamen` = bagian tidak
 * tembus pandang di seluruh gambar.
 */
export function hitungTransparansi(rgba: ArrayLike<number>, lebar: number, tinggi: number) {
  const a = KETENTUAN_TWIBBON.areaWajah;
  const x1 = Math.floor(lebar * a.x1);
  const x2 = Math.ceil(lebar * a.x2);
  const y1 = Math.floor(tinggi * a.y1);
  const y2 = Math.ceil(tinggi * a.y2);
  let tembus = 0;
  let wajah = 0;
  let wajahTembus = 0;
  for (let y = 0; y < tinggi; y++) {
    for (let x = 0; x < lebar; x++) {
      const t = rgba[(y * lebar + x) * 4 + 3] < 128;
      if (t) tembus++;
      if (x >= x1 && x < x2 && y >= y1 && y < y2) {
        wajah++;
        if (t) wajahTembus++;
      }
    }
  }
  const total = lebar * tinggi;
  return {
    wajah: wajah ? wajahTembus / wajah : 0,
    ornamen: total ? 1 - tembus / total : 0,
  };
}

export function cekTransparansi(t: { wajah: number; ornamen: number }): string[] {
  const masalah: string[] = [];
  if (t.wajah < KETENTUAN_TWIBBON.wajahTembusMin) {
    masalah.push(
      `Bagian tengah hanya ${Math.round(t.wajah * 100)}% transparan, wajah pegawai akan tertutup. ` +
        "Hapus latar belakang di area wajah (ekspor PNG dengan latar transparan)."
    );
  }
  if (t.ornamen < 0.02) masalah.push("Gambar hampir seluruhnya transparan, tidak ada bingkai yang terlihat.");
  return masalah;
}

/** Ukuran unggahan: gambar yang lebih besar dari ukuran saran dikecilkan (rasio tetap). */
export function ukuranUnggahTwibbon(lebar: number, tinggi: number): { lebar: number; tinggi: number } {
  const k = KETENTUAN_TWIBBON;
  const skala = Math.min(1, k.lebarSaran / lebar, k.tinggiSaran / tinggi);
  return { lebar: Math.round(lebar * skala), tinggi: Math.round(tinggi * skala) };
}
