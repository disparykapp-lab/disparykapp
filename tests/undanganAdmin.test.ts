// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatWaktuWIB, kodeUndanganSah, pesanStatus, sisaWaktu, statusUndangan, teksUndangan, urlUndangan } from "../src/lib/undanganAdminAturan.ts";

const SEKARANG = Date.parse("2026-11-19T07:00:00Z");
const dasar = { dibatalkan_at: null, dipakai_at: null, berlaku_sampai: "2026-11-26T07:00:00Z", pembuat: { role: "admin", aktif: true } };

test("kodeUndanganSah: hanya 32 heksa kecil", () => {
  assert.equal(kodeUndanganSah("0123456789abcdef0123456789abcdef"), true);
  assert.equal(kodeUndanganSah("0123456789ABCDEF0123456789abcdef"), false);
  assert.equal(kodeUndanganSah("0123456789abcdef"), false);
  assert.equal(kodeUndanganSah(undefined), false);
});

test("urlUndangan", () => {
  assert.equal(urlUndangan("https://disparyk.app/", "ab".repeat(16)), `https://disparyk.app/daftar-admin/${"ab".repeat(16)}`);
});

test("statusUndangan: urutan sama dengan database", () => {
  assert.equal(statusUndangan(dasar, SEKARANG), "berlaku");
  assert.equal(statusUndangan({ ...dasar, dibatalkan_at: "x", dipakai_at: "y" }, SEKARANG), "dibatalkan");
  assert.equal(statusUndangan({ ...dasar, dipakai_at: "y" }, SEKARANG), "dipakai");
  assert.equal(statusUndangan({ ...dasar, pembuat: { role: "user", aktif: true } }, SEKARANG), "tidak_berlaku");
  assert.equal(statusUndangan({ ...dasar, pembuat: null }, SEKARANG), "tidak_berlaku");
  assert.equal(statusUndangan({ ...dasar, berlaku_sampai: "2026-11-19T07:00:00Z" }, SEKARANG), "kedaluwarsa");
});

test("sisaWaktu", () => {
  assert.equal(sisaWaktu("2026-11-26T07:00:00Z", SEKARANG), "7 hari lagi");
  assert.equal(sisaWaktu("2026-11-26T06:59:00Z", SEKARANG), "7 hari lagi");
  assert.equal(sisaWaktu("2026-11-25T09:00:00Z", SEKARANG), "6 hari lagi");
  assert.equal(sisaWaktu("2026-11-20T08:00:00Z", SEKARANG), "1 hari lagi");
  assert.equal(sisaWaktu("2026-11-20T06:59:00Z", SEKARANG), "23 jam lagi");
  assert.equal(sisaWaktu("2026-11-19T07:30:00Z", SEKARANG), "kurang dari 1 jam");
  assert.equal(sisaWaktu("2026-11-19T06:00:00Z", SEKARANG), "sudah lewat");
});

test("formatWaktuWIB & teksUndangan", () => {
  assert.equal(formatWaktuWIB("2026-11-26T14:41:05Z"), "26 Nov, 21.41");
  assert.equal(formatWaktuWIB("2026-12-31T17:05:00Z"), "1 Jan, 00.05");
  const t = teksUndangan("2026-11-26T14:41:05Z");
  assert.match(t, /Gmail/);
  assert.match(t, /sekali/);
  assert.match(t, /26 Nov, 21\.41 WIB/);
});

test("pesanStatus punya judul untuk tiap status", () => {
  for (const s of ["dipakai", "dibatalkan", "kedaluwarsa", "tidak_berlaku", "tidak_ada"] as const) {
    assert.ok(pesanStatus(s).judul.length > 0);
  }
});
