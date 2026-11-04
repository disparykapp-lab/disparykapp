// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { msSampaiBesokWIB } from "../src/lib/absensiMeta.ts";

const MENIT = 60 * 1000;
const JAM = 60 * MENIT;

test("foto absen disembunyikan tepat pukul 00.00 WIB", () => {
  // 08:00 WIB = 01:00 UTC → sisa 16 jam
  assert.equal(msSampaiBesokWIB(new Date("2026-11-04T01:00:00Z")), 16 * JAM);
  // 23:59 WIB = 16:59 UTC → sisa 1 menit
  assert.equal(msSampaiBesokWIB(new Date("2026-11-04T16:59:00Z")), MENIT);
  // 00:00 WIB tepat = 17:00 UTC hari sebelumnya → hari baru, sisa 24 jam
  assert.equal(msSampaiBesokWIB(new Date("2026-11-04T17:00:00Z")), 24 * JAM);
  // 06:30 UTC = 13:30 WIB, tidak terpengaruh zona waktu perangkat
  assert.equal(msSampaiBesokWIB(new Date("2026-11-04T06:30:00Z")), 10 * JAM + 30 * MENIT);
});

test("policy foto absen: pemilik hanya hari ini, admin tetap semua", () => {
  const sql = readFileSync("supabase/migrations/0036_foto_absen_hari_ini.sql", "utf8");
  assert.match(sql, /drop policy if exists absensi_foto_select on storage\.objects;/);
  assert.match(sql, /is_admin\(\)\s+or \(/);
  assert.match(sql, /tanggal_kantor\(created_at\) = tanggal_kantor\(now\(\)\)/);
});
