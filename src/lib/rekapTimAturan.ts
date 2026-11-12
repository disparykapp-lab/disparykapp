// Rekap absensi tim untuk admin (murni — diuji di tests/rekapTim.test.ts).
// Per pegawai memakai aturan yang sama dengan Rekap pegawai (rekapSayaAturan),
// jadi angka admin & angka yang dilihat pegawai sendiri selalu sama.
import { selisihHari, tambahHari, type PilihanRentang } from "./izinAturan.ts";
import { hitungRekapSaya, rentangBulanYm, geserBulanYm, susunRentang, type HariRekap, type JenisRekap, type ProfilRekap, type RingkasanSaya } from "./rekapSayaAturan.ts";

export interface PegawaiRekap extends ProfilRekap {
  id: string;
  nama: string;
  foto_url: string | null;
  divisi_id: string | null;
  jabatan: string | null;
}

interface BarisTim {
  user_id: string;
  tanggal: string;
  status: string;
  masuk_at: string | null;
  keluar_at: string | null;
}

export interface EntriTim<P extends PegawaiRekap, R extends BarisTim> {
  p: P;
  hari: HariRekap<R>[];
  ringkas: RingkasanSaya;
  /** skor kerajinan 0–100; null = belum ada hari wajib atau tidak wajib absen */
  skor: number | null;
  wajib: boolean;
}

/** Hadir tepat waktu & dinas luar = 1 poin, telat & izin = ½, tidak absen = 0 — dibagi hari wajib. */
export function skorKerajinan(h: Record<JenisRekap, number>, hariWajib: number): number | null {
  if (!hariWajib) return null;
  return Math.min(100, Math.round(((h.hadir + h.dinas + 0.5 * (h.telat + h.izin)) / hariWajib) * 100));
}

/** Satu entri per pegawai, terajin dulu; yang tidak wajib absen di paling bawah. */
export function susunTim<P extends PegawaiRekap, R extends BarisTim>(rows: R[], pegawai: P[], dari: string, sampai: string, hariIni: string): EntriTim<P, R>[] {
  const per = new Map<string, R[]>();
  for (const r of rows) {
    const a = per.get(r.user_id) ?? [];
    a.push(r);
    per.set(r.user_id, a);
  }
  return pegawai
    .map((p) => {
      const wajib = p.wajib_absen !== false;
      const hari = susunRentang(dari, sampai, per.get(p.id) ?? [], p, hariIni);
      const ringkas = hitungRekapSaya(hari, hariIni);
      return { p, hari, ringkas, skor: wajib ? skorKerajinan(ringkas.hitung, ringkas.hariWajib) : null, wajib };
    })
    .sort(
      (a, b) =>
        Number(b.wajib) - Number(a.wajib) ||
        (b.skor ?? -1) - (a.skor ?? -1) ||
        a.ringkas.hitung.tidak - b.ringkas.hitung.tidak ||
        a.ringkas.hitung.telat - b.ringkas.hitung.telat ||
        a.p.nama.localeCompare(b.p.nama, "id")
    );
}

/** Jumlah seluruh tim (hari-orang). */
export function totalTim(entri: { ringkas: RingkasanSaya }[]): RingkasanSaya {
  const hitung: Record<JenisRekap, number> = { hadir: 0, telat: 0, dinas: 0, izin: 0, tidak: 0 };
  let menitKerja = 0;
  for (const e of entri) {
    for (const k of Object.keys(hitung) as JenisRekap[]) hitung[k] += e.ringkas.hitung[k];
    menitKerja += e.ringkas.menitKerja;
  }
  const masuk = hitung.hadir + hitung.telat + hitung.dinas;
  const hariWajib = masuk + hitung.izin + hitung.tidak;
  return { hitung, hariWajib, persen: hariWajib ? Math.round((masuk / hariWajib) * 100) : null, menitKerja };
}

/** Kotak ringkasan diketuk: hanya pegawai yang punya hari jenis itu, terbanyak dulu. */
export function saringTim<E extends { p: { nama: string }; ringkas: RingkasanSaya }>(entri: E[], jenis: JenisRekap | null): E[] {
  if (!jenis) return entri;
  return entri
    .filter((e) => e.ringkas.hitung[jenis] > 0)
    .sort((a, b) => b.ringkas.hitung[jenis] - a.ringkas.hitung[jenis] || a.p.nama.localeCompare(b.p.nama, "id"));
}

/** Bentuk yang dipakai podium & gambar peringkat (EntriPeringkat di lib/peringkat). */
export function keEntriPeringkat(e: EntriTim<PegawaiRekap, BarisTim>) {
  const h = e.ringkas.hitung;
  return { id: e.p.id, nama: e.p.nama, foto_url: e.p.foto_url, hadir: h.hadir, dinasLuar: h.dinas, telat: h.telat, izin: h.izin, tidakAbsen: h.tidak, skor: e.skor ?? 0 };
}

/** Ringkasan untuk lembar ringkasan file Excel. */
export function ringkasanExcel(r: RingkasanSaya) {
  return { hadir: r.hitung.hadir, telat: r.hitung.telat, dinasLuar: r.hitung.dinas, izin: r.hitung.izin, tidakAbsen: r.hitung.tidak, totalJamKerja: r.menitKerja / 60 };
}

// ---- periode ----

export const MAKS_HARI_REKAP = 366;

export function bulanPenuh(dari: string, sampai: string): boolean {
  return dari.slice(0, 7) === sampai.slice(0, 7) && rentangBulanYm(dari.slice(0, 7)).dari === dari && rentangBulanYm(dari.slice(0, 7)).sampai === sampai;
}

/** ‹ › : sebulan penuh → bulan sebelum/berikut; selain itu geser sepanjang rentangnya. */
export function geserPeriode(dari: string, sampai: string, n: 1 | -1): { dari: string; sampai: string } {
  if (bulanPenuh(dari, sampai)) return rentangBulanYm(geserBulanYm(dari.slice(0, 7), n));
  const lama = selisihHari(dari, sampai) + 1;
  return { dari: tambahHari(dari, n * lama), sampai: tambahHari(sampai, n * lama) };
}

export function seninMinggu(ymd: string): string {
  return tambahHari(ymd, -((new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7));
}

export function periodeCepat(hariIni: string): { id: string; label: string; dari: string; sampai: string }[] {
  const bulanIni = hariIni.slice(0, 7);
  const senin = seninMinggu(hariIni);
  return [
    { id: "minggu", label: "Minggu ini", dari: senin, sampai: tambahHari(senin, 6) },
    { id: "bulan", label: "Bulan ini", ...rentangBulanYm(bulanIni) },
    { id: "lalu", label: "Bulan lalu", ...rentangBulanYm(geserBulanYm(bulanIni, -1)) },
    { id: "tahun", label: "Tahun ini", dari: `${hariIni.slice(0, 4)}-01-01`, sampai: `${hariIni.slice(0, 4)}-12-31` },
  ];
}

/** Batas kalender rentang: 2 tahun ke belakang s.d. akhir bulan ini; paling panjang 366 hari. */
export function batasRekap(hariIni: string, p: PilihanRentang): { min: string; max: string } {
  const min = tambahHari(hariIni, -730);
  const max = rentangBulanYm(hariIni.slice(0, 7)).sampai;
  if (p.mulai && !p.selesai) {
    const m = tambahHari(p.mulai, MAKS_HARI_REKAP - 1);
    return { min, max: m < max ? m : max };
  }
  return { min, max };
}
