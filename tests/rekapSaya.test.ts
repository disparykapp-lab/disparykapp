// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { geserBulanYm, hitungRekapSaya, jenisBaris, rentangBulanYm, susunBulan, susunRentang, type ProfilRekap } from "../src/lib/rekapSayaAturan.ts";

const HARI_INI = "2026-11-12"; // Kamis
const PROFIL: ProfilRekap = { aktif: true, wajib_absen: true, created_at: "2026-01-05T02:00:00Z", tanggal_mulai_magang: null, tanggal_selesai_magang: null };
const B = (tanggal: string, status: string, masuk: string | null = null, keluar: string | null = null) => ({
  tanggal,
  status,
  masuk_at: masuk && `${tanggal}T${masuk}:00+07:00`,
  keluar_at: keluar && `${tanggal}T${keluar}:00+07:00`,
});

test("rentang & geser bulan", () => {
  assert.deepEqual(rentangBulanYm("2026-11"), { dari: "2026-11-01", sampai: "2026-11-30" });
  assert.deepEqual(rentangBulanYm("2028-02"), { dari: "2028-02-01", sampai: "2028-02-29" });
  assert.equal(geserBulanYm("2026-11", 2), "2027-01");
  assert.equal(geserBulanYm("2026-01", -1), "2025-12");
  assert.equal(geserBulanYm("2026-11", -12), "2025-11");
});

test("jenis baris: telat, dinas luar, izin; absen di hari izin = hadir", () => {
  assert.equal(jenisBaris(B("2026-11-02", "hadir", "07:55")), "hadir");
  assert.equal(jenisBaris(B("2026-11-02", "telat", "08:30")), "telat");
  assert.equal(jenisBaris(B("2026-11-02", "dinas_luar", "08:30")), "dinas");
  assert.equal(jenisBaris(B("2026-11-02", "izin")), "izin");
});

test("susunBulan: tiap tanggal punya jenis — tidak absen hitam, libur, hari ini, mendatang", () => {
  const rows = [
    B("2026-11-02", "hadir", "07:55", "16:05"),
    B("2026-11-03", "telat", "08:40", "16:00"),
    B("2026-11-04", "izin"),
    B("2026-11-05", "dinas_luar", "08:00"),
    B("2026-11-20", "izin"), // izin terjadwal
  ];
  const hari = susunBulan("2026-11", rows, PROFIL, HARI_INI);
  const j = Object.fromEntries(hari.map((h) => [h.tanggal, h.jenis]));
  assert.equal(hari.length, 30);
  assert.equal(j["2026-11-01"], "libur", "Minggu");
  assert.equal(j["2026-11-02"], "hadir");
  assert.equal(j["2026-11-03"], "telat");
  assert.equal(j["2026-11-04"], "izin");
  assert.equal(j["2026-11-05"], "dinas");
  assert.equal(j["2026-11-06"], "tidak", "Jumat tanpa absen");
  assert.equal(j["2026-11-07"], "libur");
  assert.equal(j["2026-11-12"], "belum", "hari ini belum absen bukan 'tidak absen'");
  assert.equal(j["2026-11-13"], "nanti");
  assert.equal(j["2026-11-20"], "izin");
});

test("hitungRekapSaya: persen hadir, menit kerja, izin mendatang tidak dihitung", () => {
  const rows = [B("2026-11-02", "hadir", "07:55", "16:05"), B("2026-11-03", "telat", "08:40", "16:00"), B("2026-11-04", "izin"), B("2026-11-20", "izin")];
  const r = hitungRekapSaya(susunBulan("2026-11", rows, PROFIL, HARI_INI), HARI_INI);
  // hari kerja s.d. kemarin: 2,3,4,5,6,9,10,11 = 8 → hadir 1, telat 1, izin 1, tidak 5
  assert.deepEqual(r.hitung, { hadir: 1, telat: 1, dinas: 0, izin: 1, tidak: 5 });
  assert.equal(r.hariWajib, 8);
  assert.equal(r.persen, 25);
  assert.equal(r.menitKerja, 490 + 440);
});

test("tidak wajib absen / sebelum terdaftar / di luar masa magang: bukan 'tidak absen'", () => {
  const tak = hitungRekapSaya(susunBulan("2026-11", [], { ...PROFIL, wajib_absen: false }, HARI_INI), HARI_INI);
  assert.equal(tak.hitung.tidak, 0);
  assert.equal(tak.persen, null);
  const baru = susunBulan("2026-11", [], { ...PROFIL, created_at: "2026-11-09T01:00:00Z" }, HARI_INI);
  assert.equal(baru.find((h) => h.tanggal === "2026-11-06")?.jenis, "kosong");
  assert.equal(baru.find((h) => h.tanggal === "2026-11-09")?.jenis, "tidak");
  const magang = susunBulan("2026-11", [], { ...PROFIL, tanggal_selesai_magang: "2026-11-05" }, HARI_INI);
  assert.equal(magang.find((h) => h.tanggal === "2026-11-06")?.jenis, "kosong");
});

test("bulan depan: semua 'nanti' kecuali izin terjadwal; tidak ada yang dihitung", () => {
  const hari = susunBulan("2026-12", [B("2026-12-01", "izin")], PROFIL, HARI_INI);
  assert.equal(hari[0].jenis, "izin");
  assert.ok(hari.slice(1).every((h) => h.jenis === "nanti"));
  assert.equal(hitungRekapSaya(hari, HARI_INI).hariWajib, 0);
});

test("susunRentang: lintas bulan, terbalik ditukar, ringkasan hanya hari dalam rentang", () => {
  const rows = [
    B("2026-10-30", "hadir", "07:55", "16:00"), // Jumat
    B("2026-11-02", "telat", "08:40", "16:00"), // Senin
    B("2026-11-06", "hadir", "07:50", "16:00"), // di luar rentang
  ];
  const hari = susunRentang("2026-11-03", "2026-10-29", rows, PROFIL, HARI_INI);
  assert.equal(hari[0].tanggal, "2026-10-29");
  assert.equal(hari.at(-1)?.tanggal, "2026-11-03");
  assert.equal(hari.length, 6);
  const r = hitungRekapSaya(hari, HARI_INI);
  // 29 Okt (Kamis) & 3 Nov (Selasa) tanpa absen = tidak absen; 31 Okt & 1 Nov libur
  assert.deepEqual(r.hitung, { hadir: 1, telat: 1, dinas: 0, izin: 0, tidak: 2 });
  assert.equal(r.persen, 50);
  assert.equal(susunRentang("2026-11-12", "2026-11-12", [], PROFIL, HARI_INI).length, 1);
});
