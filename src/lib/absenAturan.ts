// Alur Absen Masuk / Pulang (murni — diuji di tests/absenAturan.test.ts).
// Pemeriksaan di sini hanya pratinjau supaya pegawai tidak sia-sia berfoto;
// keputusan akhir tetap di absen_masuk()/absen_pulang() di server.
import { formatDurasi, jamPada, jamPendek } from "./statusHariIni.ts";

export type JenisAbsen = "masuk" | "pulang";
export type ModeAbsen = "kantor" | "luar";

export interface AturanKantor {
  lat: number | null;
  lng: number | null;
  radius: number;
  akurasiMaks: number;
  jamMasuk: string | null;
  jamPulang: string | null;
}

export interface PosisiGps {
  lat: number;
  lng: number;
  akurasi: number;
}

const BUMI = 6371000;
const MENIT = 60_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Rumus yang sama persis dengan jarak_meter() di server (0002). */
export function jarakMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const c = Math.sin(rad(lat1)) * Math.sin(rad(lat2)) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1));
  return BUMI * Math.acos(Math.min(1, Math.max(-1, c)));
}

/** 45 → "45 m", 1234 → "1,2 km", 152000 → "152 km". */
export function formatJarak(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 100_000) return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
  return `${Math.round(m / 1000)} km`;
}

export interface CekLokasi {
  /** jarak ke titik kantor (m); null kalau posisi atau titik kantor belum ada */
  jarak: number | null;
  /** posisi relatif dari kantor (m) untuk radar: timur +, utara + */
  timur: number;
  utara: number;
  dalamRadius: boolean | null;
  akurasiOk: boolean | null;
  kantorAda: boolean;
}

export function cekLokasi(posisi: PosisiGps | null, kantor: AturanKantor | null): CekLokasi {
  const kantorAda = kantor?.lat != null && kantor?.lng != null;
  const akurasiOk = posisi && kantor ? posisi.akurasi <= kantor.akurasiMaks : null;
  if (!posisi || !kantor || !kantorAda) return { jarak: null, timur: 0, utara: 0, dalamRadius: null, akurasiOk, kantorAda };
  const jarak = jarakMeter(kantor.lat!, kantor.lng!, posisi.lat, posisi.lng);
  return {
    jarak,
    timur: rad(posisi.lng - kantor.lng!) * BUMI * Math.cos(rad(kantor.lat!)),
    utara: rad(posisi.lat - kantor.lat!) * BUMI,
    dalamRadius: jarak <= kantor.radius,
    akurasiOk,
    kantorAda,
  };
}

/**
 * Letak titik "kamu" di radar (satuan viewBox, pusat 0,0 = kantor, y ke bawah).
 * Lingkaran radius kantor digambar di `rRadius`; posisi yang jauh dijepit di tepi.
 */
export function titikRadar(cek: CekLokasi, radius: number, rRadius = 30, maks = 44) {
  const skala = rRadius / Math.max(1, radius);
  const d = Math.hypot(cek.timur, cek.utara) * skala;
  const k = d > maks ? maks / d : 1;
  return { x: cek.timur * skala * k, y: -cek.utara * skala * k, diluar: d > maks };
}

export type Nada = "hijau" | "kuning" | "biru" | "abu";

export interface WaktuAbsen {
  chip: { teks: string; nada: Nada } | null;
  /** keterangan di bawah jam, mis. "Jadwal masuk 08.00 · 12m lagi" */
  ket: string;
  /** konteks saran keterangan: telat masuk / pulang lebih awal */
  saran: "telat" | "awal" | null;
}

/** Prediksi status dari jam sekarang (WIB) — sama dengan aturan telat di absen_masuk(). */
export function waktuAbsen(jenis: JenisAbsen, mode: ModeAbsen, sekarang: number, tanggal: string, aturan: AturanKantor | null): WaktuAbsen {
  if (jenis === "masuk") {
    const jam = aturan?.jamMasuk;
    const jadwal = jam ? `Jadwal masuk ${jamPendek(jam)}` : "";
    if (mode === "luar") return { chip: { teks: "Dinas Luar", nada: "biru" }, ket: jadwal, saran: null };
    if (!jam) return { chip: null, ket: "", saran: null };
    const lewat = sekarang - jamPada(tanggal, jam);
    if (lewat > 0) return { chip: { teks: `Telat ${formatDurasi(Math.ceil(lewat / MENIT))}`, nada: "kuning" }, ket: jadwal, saran: "telat" };
    const lagi = Math.floor(-lewat / MENIT);
    return { chip: { teks: "Tepat waktu", nada: "hijau" }, ket: lagi > 0 ? `${jadwal} · ${formatDurasi(lagi)} lagi` : jadwal, saran: null };
  }
  const jam = aturan?.jamPulang;
  if (!jam) return { chip: null, ket: "", saran: null };
  const sisa = jamPada(tanggal, jam) - sekarang;
  const jadwal = `Jadwal pulang ${jamPendek(jam)}`;
  if (sisa > 0) return { chip: { teks: `Pulang awal ${formatDurasi(Math.ceil(sisa / MENIT))}`, nada: "kuning" }, ket: jadwal, saran: "awal" };
  return { chip: { teks: "Waktunya pulang", nada: "hijau" }, ket: jadwal, saran: null };
}

/** Boleh lanjut ke kamera? Kalau tidak, alasan singkat untuk ditampilkan di atas tombol. */
export function bolehLanjut(mode: ModeAbsen, posisi: PosisiGps | null, cek: CekLokasi, kantor: AturanKantor | null, catatanDinas: string): { boleh: boolean; alasan: string | null } {
  if (!posisi) return { boleh: false, alasan: "Menunggu lokasi kamu…" };
  if (mode === "luar" && catatanDinas.trim().length < 5) return { boleh: false, alasan: "Tulis tugas dinas luarnya dulu (min. 5 huruf)." };
  // pengaturan gagal dimuat → jangan menghalangi, server tetap memeriksa
  if (!kantor) return { boleh: true, alasan: null };
  if (cek.akurasiOk === false) return { boleh: false, alasan: `Sinyal lokasi belum akurat (±${Math.round(posisi.akurasi)} m). Tunggu sebentar atau pindah ke tempat terbuka.` };
  if (mode === "kantor" && !cek.kantorAda) return { boleh: false, alasan: "Titik kantor belum diatur admin. Hubungi admin." };
  if (mode === "kantor" && cek.dalamRadius === false) return { boleh: false, alasan: "Kamu di luar radius kantor. Pilih Dinas Luar kalau sedang bertugas di luar." };
  return { boleh: true, alasan: null };
}

export type AksiGagal = "dinas" | "lokasi" | "beranda" | "ulang";

/** Pesan galat server → judul ramah + tombol yang paling membantu. */
export function jelaskanGagal(pesan: string): { judul: string; aksi: AksiGagal } {
  if (/terlalu jauh/i.test(pesan)) return { judul: "Di luar radius kantor", aksi: "dinas" };
  if (/kurang akurat/i.test(pesan)) return { judul: "Lokasi kurang akurat", aksi: "lokasi" };
  if (/sudah absen|belum absen masuk|tidak aktif|titik lokasi kantor/i.test(pesan)) return { judul: "Absen tidak bisa diproses", aksi: "beranda" };
  if (/unggah|koneksi|fetch|network|jaringan/i.test(pesan)) return { judul: "Koneksi bermasalah", aksi: "ulang" };
  return { judul: "Absen belum tercatat", aksi: "ulang" };
}

/** Keterangan dinas luar sebelumnya (terbaru dulu, unik, maks 3) untuk chip "pakai lagi". */
export function riwayatDinas(baris: { masuk_catatan: string | null; keluar_catatan: string | null }[], maks = 3): string[] {
  const hasil: string[] = [];
  for (const b of baris) {
    for (const c of [b.masuk_catatan, b.keluar_catatan]) {
      const t = c?.trim();
      if (t && t.length >= 5 && !hasil.some((h) => h.toLowerCase() === t.toLowerCase())) hasil.push(t);
      if (hasil.length >= maks) return hasil;
    }
  }
  return hasil;
}

export const ALASAN_CEPAT: Record<"telat" | "awal" | "umum", string[]> = {
  telat: ["Macet di jalan", "Hujan deras", "Ban bocor", "Antar keluarga", "Kurang enak badan"],
  awal: ["Sudah izin atasan", "Lanjut tugas di luar", "Kurang enak badan", "Urusan keluarga"],
  umum: ["Lembur", "Rapat di luar", "Kendala sinyal", "Sudah izin atasan"],
};

/** Ketuk chip alasan: isi kosong → jadi alasan itu; sudah ada → ditambahkan (tidak dobel). */
export function sisipkanAlasan(isi: string, alasan: string): string {
  const t = isi.trim();
  if (!t) return alasan;
  if (t.toLowerCase().includes(alasan.toLowerCase())) return t;
  return `${t.replace(/[.,;]+$/, "")}, ${alasan.charAt(0).toLowerCase()}${alasan.slice(1)}`;
}
