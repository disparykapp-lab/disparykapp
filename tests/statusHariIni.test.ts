// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDurasi, jamPada, jamPendek, keadaanHariIni } from "../src/lib/statusHariIni.ts";

// Rabu 11 Nov 2026; jam kantor 08.00–16.00 WIB
const T = "2026-11-11";
const wib = (hhmm: string) => Date.parse(`${T}T${hhmm}:00+07:00`);
const iso = (hhmm: string) => new Date(wib(hhmm)).toISOString();
const k = (absensi: Parameters<typeof keadaanHariIni>[0], jam: string, tanggal = T) => keadaanHariIni(absensi, wib(jam), tanggal, "08:00:00", "16:00:00");

test("jamPada: jam kantor dihitung di WIB", () => {
  assert.equal(new Date(jamPada(T, "08:00:00")).toISOString(), "2026-11-11T01:00:00.000Z");
});

test("belum absen: pesawat parkir; hitung mundur / lewat jam masuk", () => {
  const pagi = k(null, "07:30");
  assert.equal(pagi.tahap, "belum");
  assert.equal(pagi.progres, 0);
  assert.equal(pagi.menujuMasuk, 30);
  assert.equal(k(null, "08:15").menujuMasuk, -15);
});

test("akhir pekan tanpa absen = libur; ada baris izin = izin", () => {
  assert.equal(k(null, "09:00", "2026-11-14").tahap, "libur");
  assert.equal(k({ status: "izin", masuk_at: null, keluar_at: null }, "09:00").tahap, "izin");
});

test("sedang bekerja: pesawat maju dari jam masuk menuju jam pulang", () => {
  const r = k({ status: "hadir", masuk_at: iso("08:00"), keluar_at: null }, "12:00");
  assert.equal(r.tahap, "kerja");
  assert.equal(r.progres, 0.5);
  assert.equal(r.kerjaMenit, 240);
  assert.equal(r.menujuPulang, 240);
  const lembur = k({ status: "telat", masuk_at: iso("09:00"), keluar_at: null }, "17:00");
  assert.equal(lembur.progres, 1, "lewat jam pulang: pesawat sudah sampai");
  assert.equal(lembur.menujuPulang, -60);
});

test("absen masuk di hari izin tetap dihitung bekerja (izin lepas otomatis)", () => {
  assert.equal(k({ status: "hadir", masuk_at: iso("08:10"), keluar_at: null }, "09:00").tahap, "kerja");
});

test("masuk setelah jam pulang (lembur malam): target 8 jam dari masuk", () => {
  const r = k({ status: "telat", masuk_at: iso("17:00"), keluar_at: null }, "19:00");
  assert.equal(r.progres, 0.25);
});

test("selesai: pesawat mendarat, total jam kerja dari masuk sampai pulang", () => {
  const r = k({ status: "hadir", masuk_at: iso("07:58"), keluar_at: iso("16:05") }, "20:00");
  assert.equal(r.tahap, "selesai");
  assert.equal(r.progres, 1);
  assert.equal(r.kerjaMenit, 487);
});

test("tanpa jam kantor (pengaturan belum termuat)", () => {
  const r = keadaanHariIni({ status: "hadir", masuk_at: iso("08:00"), keluar_at: null }, wib("10:00"), T, null, null);
  assert.equal(r.menujuPulang, null);
  assert.equal(r.progres, 0.25);
});

test("formatDurasi & jamPendek", () => {
  assert.equal(formatDurasi(192), "3j 12m");
  assert.equal(formatDurasi(45), "45m");
  assert.equal(formatDurasi(120), "2j");
  assert.equal(formatDurasi(-5), "0m");
  assert.equal(jamPendek("08:00:00"), "08.00");
});
