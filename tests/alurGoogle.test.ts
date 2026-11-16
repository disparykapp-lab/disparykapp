// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { arahSetelahGoogle, bacaTujuan, bersihkanKembali, BATAS_TUJUAN_MS } from "../src/lib/alurGoogle.ts";
import type { TujuanTersimpan } from "../src/lib/alurGoogle.ts";

const DAFTAR: TujuanTersimpan = { ke: "/daftar", kembali: null };
const LOGIN: TujuanTersimpan = { ke: "/login", kembali: null };

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
  assert.deepEqual(bacaTujuan(simpan("/daftar", SEKARANG - 1000), SEKARANG), DAFTAR);
  assert.deepEqual(bacaTujuan(simpan("/login", SEKARANG), SEKARANG), LOGIN);
  assert.equal(bacaTujuan(simpan("/daftar", SEKARANG - BATAS_TUJUAN_MS), SEKARANG), null, "kedaluwarsa");
  assert.equal(bacaTujuan(simpan("/daftar", SEKARANG + 5000), SEKARANG), null, "jam dari masa depan");
  assert.equal(bacaTujuan(simpan("/kelola", SEKARANG), SEKARANG), null, "halaman lain tidak diterima");
  assert.equal(bacaTujuan(JSON.stringify({ ke: "/login" }), SEKARANG), null);
  assert.equal(bacaTujuan("{rusak", SEKARANG), null);
  assert.equal(bacaTujuan(null, SEKARANG), null);
});

test("tanpa tujuan atau masih memuat: tidak ada pengarahan", () => {
  assert.deepEqual(arahSetelahGoogle(null, k({ adaSesi: true, adaProfil: true }), "/"), { selesai: false, ke: null });
  assert.deepEqual(arahSetelahGoogle(DAFTAR, k({ loading: true }), "/"), { selesai: false, ke: null });
});

test("daftar: kembali dari Google di halaman depan → dibawa ke formulir", () => {
  assert.deepEqual(arahSetelahGoogle(DAFTAR, k({ adaSesi: true, modeDaftar: true }), "/"), { selesai: true, ke: "/daftar" });
  // landing dimatikan → sempat dilempar ke /login dulu
  assert.deepEqual(arahSetelahGoogle(DAFTAR, k({ adaSesi: true, modeDaftar: true }), "/login"), { selesai: true, ke: "/daftar" });
  assert.deepEqual(arahSetelahGoogle(DAFTAR, k({ adaSesi: true, modeDaftar: true }), "/daftar"), { selesai: true, ke: null });
});

test("daftar dengan email yang sudah aktif → langsung ke beranda", () => {
  assert.deepEqual(arahSetelahGoogle(DAFTAR, k({ adaSesi: true, adaProfil: true, modeDaftar: true }), "/"), { selesai: true, ke: "/beranda" });
});

test("daftar dengan email yang masih menunggu persetujuan → kembali ke /daftar (ada pesannya)", () => {
  assert.deepEqual(arahSetelahGoogle(DAFTAR, k({ modeDaftar: true }), "/"), { selesai: true, ke: "/daftar" });
});

test("masuk berhasil → beranda, kecuali sudah di dalam aplikasi", () => {
  assert.deepEqual(arahSetelahGoogle(LOGIN, k({ adaSesi: true, adaProfil: true }), "/"), { selesai: true, ke: "/beranda" });
  assert.deepEqual(arahSetelahGoogle(LOGIN, k({ adaSesi: true, adaProfil: true }), "/login"), { selesai: true, ke: "/beranda" });
  assert.deepEqual(arahSetelahGoogle(LOGIN, k({ adaSesi: true, adaProfil: true }), "/absen/masuk"), { selesai: true, ke: null });
});

test("masuk ditolak (belum terdaftar / nonaktif / batal di Google) → halaman login", () => {
  assert.deepEqual(arahSetelahGoogle(LOGIN, k(), "/"), { selesai: true, ke: "/login" });
  assert.deepEqual(arahSetelahGoogle(LOGIN, k(), "/login"), { selesai: true, ke: null });
  // profil gagal dimuat (jaringan) — sesi ada tapi tidak sedang mendaftar
  assert.deepEqual(arahSetelahGoogle(LOGIN, k({ adaSesi: true }), "/"), { selesai: true, ke: "/login" });
});

test("kembali: setelah sesi berakhir & masuk lagi, buka halaman tadi", () => {
  const simpan = (o: object) => JSON.stringify({ ke: "/login", t: SEKARANG, ...o });
  assert.deepEqual(bacaTujuan(simpan({ kembali: "/naskah-ai" }), SEKARANG), { ke: "/login", kembali: "/naskah-ai" });
  assert.deepEqual(bacaTujuan(JSON.stringify({ ke: "/daftar", t: SEKARANG, kembali: "/naskah-ai" }), SEKARANG), DAFTAR, "daftar tidak memakai kembali");
  const tujuan: TujuanTersimpan = { ke: "/login", kembali: "/naskah-ai" };
  assert.deepEqual(arahSetelahGoogle(tujuan, k({ adaSesi: true, adaProfil: true }), "/"), { selesai: true, ke: "/naskah-ai" });
  assert.deepEqual(arahSetelahGoogle(tujuan, k(), "/"), { selesai: true, ke: "/login" }, "gagal masuk tetap ke /login");
});

test("bersihkanKembali: hanya jalur aplikasi", () => {
  assert.equal(bersihkanKembali("/naskah-ai"), "/naskah-ai");
  assert.equal(bersihkanKembali("/tugas?id=12"), "/tugas?id=12");
  assert.equal(bersihkanKembali("/login"), null);
  assert.equal(bersihkanKembali("/daftar?x=1"), null);
  assert.equal(bersihkanKembali("/"), null);
  assert.equal(bersihkanKembali("//situs-lain.com"), null);
  assert.equal(bersihkanKembali("https://situs-lain.com"), null);
  assert.equal(bersihkanKembali("/\\situs-lain.com"), null);
  assert.equal(bersihkanKembali(undefined), null);
  assert.equal(bersihkanKembali(42), null);
});
