// Ringkasan rekap absensi (murni, tanpa dependensi — diuji di tests/izin.test.ts).

export interface Ringkasan {
  hadir: number;
  telat: number;
  dinasLuar: number;
  izin: number;
  tidakAbsen: number;
  totalJamKerja: number;
}

type Baris = { tanggal: string; status: string; masuk_at: string | null; keluar_at: string | null };

/** Tanggal lokal perangkat "YYYY-MM-DD". */
export const ymdLokal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Jumlah hari kerja (Senin–Jumat) dari `dari` sampai `sampai`, paling jauh sampai `hariIni` (inklusif). */
export function hariKerjaSampai(dari: Date, sampai: Date, hariIni: string): number {
  const akhir = ymdLokal(sampai) < hariIni ? ymdLokal(sampai) : hariIni;
  let n = 0;
  for (const cur = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate()); ymdLokal(cur) <= akhir; cur.setDate(cur.getDate() + 1)) {
    const h = cur.getDay();
    if (h !== 0 && h !== 6) n++;
  }
  return n;
}

/**
 * wajibAbsen=false: pegawai tidak wajib absen, jadi hari tanpa absen tidak dihitung "tidak absen".
 * Hanya sampai hari ini: izin yang sudah diajukan untuk hari-hari mendatang (0043) belum
 * dihitung, sama seperti hari kerjanya — jadi "tidak absen" & skor peringkat tidak bergeser.
 */
export function hitungRingkasan(
  semua: Baris[],
  dari: Date,
  sampai: Date,
  wajibAbsen = true,
  hariIni = ymdLokal(new Date())
): Ringkasan {
  const rows = semua.filter((r) => r.tanggal <= hariIni);
  let hadir = 0;
  let telat = 0;
  let dinasLuar = 0;
  let izin = 0;
  let totalMs = 0;

  for (const r of rows) {
    if (r.status === "hadir") hadir++;
    else if (r.status === "telat") telat++;
    else if (r.status === "dinas_luar") dinasLuar++;
    else if (r.status === "izin") izin++;

    if (r.masuk_at && r.keluar_at) {
      totalMs += new Date(r.keluar_at).getTime() - new Date(r.masuk_at).getTime();
    }
  }

  const hariKerja = hariKerjaSampai(dari, sampai, hariIni);
  const tidakAbsen = wajibAbsen ? Math.max(0, hariKerja - rows.length) : 0;

  return {
    hadir,
    telat,
    dinasLuar,
    izin,
    tidakAbsen,
    totalJamKerja: totalMs / (1000 * 60 * 60),
  };
}
