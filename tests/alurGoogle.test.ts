// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { arahSetelahGoogle, bacaTujuan, BATAS_TUJUAN_MS } from "../src/lib/alurGoogle.ts";

const SEKARANG = 1_800_000_000_000;
const k = (ubah: Partial<{ loading: boolean; adaSesi: boolean; adaProfil: boolean; modeDaftar: boolean }> = {}) => ({
  loading: false,
  adaSesi: false,
  adaProfil: false,
  modeDaftar: false,
  ...ubah,
});

test("bacaTujuan: hanya /login atau /daftar yang masih baru", () => {
  const simpan = (ke: string, t: number) => JSON.stringify({ ke, t });
  assert.equal(bacaTujuan(simpan("/daftar", SEKARANG - 1000), SEKARANG), "/daftar");
  assert.equal(bacaTujuan(simpan("/login", SEKARANG), SEKARANG), "/login");
  assert.equal(bacaTujuan(simpan("/daftar", SEKARANG - BATAS_TUJUAN_MS), SEKARANG), null, "kedaluwarsa");
  assert.equal(bacaTujuan(simpan("/daftar", SEKARANG + 5000), SEKARANG), null, "jam dari masa depan");
  assert.equal(bacaTujuan(simpan("/kelola", SEKARANG), SEKARANG), null, "halaman lain tidak diterima");
  assert.equal(bacaTujuan(JSON.stringify({ ke: "/login" }), SEKARANG), null);
  assert.equal(bacaTujuan("{rusak", SEKARANG), null);
  assert.equal(bacaTujuan(null, SEKARANG), null);
});

test("tanpa tujuan atau masih memuat: tidak ada pengarahan", () => {
  assert.deepEqual(arahSetelahGoogle(null, k({ adaSesi: true, adaProfil: true }), "/"), { selesai: false, ke: null });
  assert.deepEqual(arahSetelahGoogle("/daftar", k({ loading: true }), "/"), { selesai: false, ke: null });
});

test("daftar: kembali dari Google di halaman depan → dibawa ke formulir", () => {
  assert.deepEqual(arahSetelahGoogle("/daftar", k({ adaSesi: true, modeDaftar: true }), "/"), { selesai: true, ke: "/daftar" });
  // landing dimatikan → sempat dilempar ke /login dulu
  assert.deepEqual(arahSetelahGoogle("/daftar", k({ adaSesi: true, modeDaftar: true }), "/login"), { selesai: true, ke: "/daftar" });
  assert.deepEqual(arahSetelahGoogle("/daftar", k({ adaSesi: true, modeDaftar: true }), "/daftar"), { selesai: true, ke: null });
});

test("daftar dengan email yang sudah aktif → langsung ke beranda", () => {
  assert.deepEqual(arahSetelahGoogle("/daftar", k({ adaSesi: true, adaProfil: true, modeDaftar: true }), "/"), { selesai: true, ke: "/beranda" });
});

test("daftar dengan email yang masih menunggu persetujuan → kembali ke /daftar (ada pesannya)", () => {
  assert.deepEqual(arahSetelahGoogle("/daftar", k({ modeDaftar: true }), "/"), { selesai: true, ke: "/daftar" });
});

test("masuk berhasil → beranda, kecuali sudah di dalam aplikasi", () => {
  assert.deepEqual(arahSetelahGoogle("/login", k({ adaSesi: true, adaProfil: true }), "/"), { selesai: true, ke: "/beranda" });
  assert.deepEqual(arahSetelahGoogle("/login", k({ adaSesi: true, adaProfil: true }), "/login"), { selesai: true, ke: "/beranda" });
  assert.deepEqual(arahSetelahGoogle("/login", k({ adaSesi: true, adaProfil: true }), "/absen/masuk"), { selesai: true, ke: null });
});

test("masuk ditolak (belum terdaftar / nonaktif / batal di Google) → halaman login", () => {
  assert.deepEqual(arahSetelahGoogle("/login", k(), "/"), { selesai: true, ke: "/login" });
  assert.deepEqual(arahSetelahGoogle("/login", k(), "/login"), { selesai: true, ke: null });
  // profil gagal dimuat (jaringan) — sesi ada tapi tidak sedang mendaftar
  assert.deepEqual(arahSetelahGoogle("/login", k({ adaSesi: true }), "/"), { selesai: true, ke: "/login" });
});
