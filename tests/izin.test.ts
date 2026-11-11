// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BATAS_HARI_IZIN,
  MAKS_HARI_IZIN,
  batasPilihan,
  cekRentang,
  hariKerja,
  hariKerjaBerikutnya,
  hariKerjaDalamRentang,
  keadaanIzin,
  pilihTanggal,
  rentangAkhir,
  ringkasIzin,
  selesaiUntukDurasi,
  selisihHari,
  tambahHari,
} from "../src/lib/izinAturan.ts";
import { hariKerjaSampai, hitungRingkasan } from "../src/lib/ringkasanAbsen.ts";

// 11 Nov 2026 = Rabu
const RABU = "2026-11-11";

test("tanggal: tambah/selisih hari lintas bulan & tahun, hari kerja Senin–Jumat", () => {
  assert.equal(tambahHari("2026-11-30", 1), "2026-12-01");
  assert.equal(tambahHari("2026-12-31", 1), "2027-01-01");
  assert.equal(tambahHari("2026-03-01", -1), "2026-02-28");
  assert.equal(selisihHari("2026-11-11", "2026-12-11"), 30);
  assert.ok(hariKerja(RABU));
  assert.ok(!hariKerja("2026-11-14"), "Sabtu");
  assert.ok(!hariKerja("2026-11-15"), "Minggu");
  assert.ok(hariKerja("2026-11-16"), "Senin");
});

test("izin 3 hari dari Rabu = Rabu–Jumat; dari Kamis melewati akhir pekan sampai Senin", () => {
  assert.equal(selesaiUntukDurasi(RABU, 3), "2026-11-13");
  assert.deepEqual(hariKerjaDalamRentang(RABU, "2026-11-13"), ["2026-11-11", "2026-11-12", "2026-11-13"]);
  assert.equal(selesaiUntukDurasi("2026-11-12", 3), "2026-11-16");
  assert.deepEqual(hariKerjaDalamRentang("2026-11-12", "2026-11-16"), ["2026-11-12", "2026-11-13", "2026-11-16"]);
  assert.equal(selesaiUntukDurasi(RABU, 1), RABU);
  // mulai di hari Sabtu: hari kerja pertama Senin
  assert.equal(hariKerjaBerikutnya("2026-11-14"), "2026-11-16");
  assert.equal(selesaiUntukDurasi("2026-11-14", 1), "2026-11-16");
});

test("pilih tanggal seperti tiket: mulai → selesai, ketuk sebelum mulai / setelah lengkap = mulai baru", () => {
  let p = pilihTanggal({ mulai: null, selesai: null }, RABU);
  assert.deepEqual(p, { mulai: RABU, selesai: null });
  assert.deepEqual(rentangAkhir(p), { mulai: RABU, selesai: RABU }, "tanpa selesai = 1 hari");
  p = pilihTanggal(p, "2026-11-13");
  assert.deepEqual(p, { mulai: RABU, selesai: "2026-11-13" });
  assert.deepEqual(pilihTanggal(p, "2026-11-20"), { mulai: "2026-11-20", selesai: null }, "rentang lengkap → mulai baru");
  assert.deepEqual(pilihTanggal({ mulai: RABU, selesai: null }, "2026-11-09"), { mulai: "2026-11-09", selesai: null });
  assert.deepEqual(pilihTanggal({ mulai: RABU, selesai: null }, RABU), { mulai: RABU, selesai: RABU }, "ketuk mulai lagi = 1 hari");
  assert.equal(rentangAkhir({ mulai: null, selesai: null }), null);
});

test("batas kalender: ±60 hari, dan saat memilih selesai maks. 30 hari dari mulai", () => {
  assert.deepEqual(batasPilihan(RABU, { mulai: null, selesai: null }), { min: tambahHari(RABU, -BATAS_HARI_IZIN), max: tambahHari(RABU, BATAS_HARI_IZIN) });
  assert.equal(batasPilihan(RABU, { mulai: RABU, selesai: null }).max, tambahHari(RABU, MAKS_HARI_IZIN - 1));
  // mulai dekat batas depan: tetap dibatasi 60 hari dari hari ini
  assert.equal(batasPilihan(RABU, { mulai: tambahHari(RABU, 50), selesai: null }).max, tambahHari(RABU, 60));
});

test("cek rentang = aturan simpan_izin()", () => {
  assert.equal(cekRentang(RABU, "2026-11-13", RABU), null);
  assert.equal(cekRentang(RABU, tambahHari(RABU, 29), RABU), null, "30 hari pas boleh");
  assert.match(cekRentang(RABU, tambahHari(RABU, 30), RABU)!, /30 hari/);
  assert.match(cekRentang("2026-11-13", RABU, RABU)!, /sebelum/);
  assert.match(cekRentang(tambahHari(RABU, -61), tambahHari(RABU, -61), RABU)!, /ke belakang/);
  assert.match(cekRentang(tambahHari(RABU, 55), tambahHari(RABU, 61), RABU)!, /ke depan/);
  assert.match(cekRentang("2026-11-14", "2026-11-15", RABU)!, /Sabtu\/Minggu/);
});

test("ringkasan pengajuan: hari izin vs hari yang ternyata masuk kerja", () => {
  const izin = { id: "a", mulai: RABU, selesai: "2026-11-13" };
  const hari = [
    { tanggal: RABU, status: "telat", masuk_at: "2026-11-11T02:00:00Z", izin_id: null },
    { tanggal: "2026-11-12", status: "izin", masuk_at: null, izin_id: "a" },
    { tanggal: "2026-11-13", status: "izin", masuk_at: null, izin_id: "a" },
    { tanggal: "2026-11-20", status: "izin", masuk_at: null, izin_id: "b" },
  ];
  assert.deepEqual(ringkasIzin(izin, hari), { izin: ["2026-11-12", "2026-11-13"], masuk: [RABU] });
  assert.equal(keadaanIzin(izin, RABU), "berlangsung");
  assert.equal(keadaanIzin(izin, "2026-11-10"), "akan datang");
  assert.equal(keadaanIzin(izin, "2026-11-14"), "selesai");
});

test("rekap hanya menghitung sampai hari ini: izin hari mendatang tidak menggeser 'tidak absen'", () => {
  const dari = new Date(2026, 10, 2); // Senin 2 Nov
  const sampai = new Date(2026, 10, 30, 23, 59);
  assert.equal(hariKerjaSampai(dari, sampai, RABU), 8, "2–6 Nov (5) + 9–11 Nov (3)");
  const baris = (tanggal: string, status: string) => ({ tanggal, status, masuk_at: null, keluar_at: null });
  const rows = [
    baris("2026-11-02", "hadir"),
    baris("2026-11-03", "telat"),
    baris("2026-11-11", "izin"),
    // izin yang sudah diajukan untuk besok & lusa
    baris("2026-11-12", "izin"),
    baris("2026-11-13", "izin"),
  ];
  const r = hitungRingkasan(rows, dari, sampai, true, RABU);
  assert.equal(r.izin, 1);
  assert.equal(r.tidakAbsen, 8 - 3);
  assert.equal(hitungRingkasan(rows, dari, sampai, false, RABU).tidakAbsen, 0);
});

test("migrasi 0043 sama dengan aturan aplikasi", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0043_izin_rentang.sql", import.meta.url), "utf8");
  assert.match(sql, /selesai - mulai < 30/);
  assert.match(sql, /p_selesai - p_mulai >= 30/);
  assert.match(sql, /p_mulai < v_hari_ini - 60/);
  assert.match(sql, /p_selesai > v_hari_ini \+ 60/);
  // hanya Senin–Jumat
  assert.match(sql, /extract\(isodow from g\) < 6/);
  // hari yang sudah absen tidak ditimpa izin
  assert.match(sql, /where absensi\.masuk_at is null and absensi\.status = 'izin'/);
  // absen di hari izin → lepas dari izin, hanya oleh pegawai sendiri
  assert.match(sql, /new\.user_id = auth\.uid\(\)/);
  assert.match(sql, /new\.izin_id := null/);
  // tulis hanya lewat RPC: tidak ada policy insert/update/delete untuk izin_pegawai
  assert.doesNotMatch(sql, /on izin_pegawai for (insert|update|delete)/);
});
