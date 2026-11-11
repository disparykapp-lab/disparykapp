// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TANPA_DIVISI,
  batasMagang,
  cekPegawaiBaru,
  cocokCari,
  cocokDivisi,
  cocokSaring,
  fotoBesar,
  hitungKotak,
  selesaiMagang,
  urutkanPegawai,
  type PegawaiRingkas,
} from "../src/lib/pegawaiAturan.ts";
import { inisial } from "../src/lib/inisial.ts";
import { tambahHari } from "../src/lib/izinAturan.ts";

const P = (id: string, nama: string, lain: Partial<PegawaiRingkas> = {}): PegawaiRingkas => ({
  id,
  nama,
  email: `${id}@gmail.com`,
  jabatan: null,
  role: "user",
  aktif: true,
  divisi_id: "d1",
  tanggal_mulai_magang: null,
  tanggal_selesai_magang: null,
  ...lain,
});

const daftar = [
  P("a", "Budi", { role: "admin" }),
  P("b", "Ani", { tanggal_mulai_magang: "2026-09-01", tanggal_selesai_magang: "2027-02-28", jabatan: "Staf Humas" }),
  P("c", "Citra", { aktif: false, divisi_id: null }),
  P("d", "Dodi"),
];
const online = new Set(["d"]);

test("kotak ringkasan: semua / online / admin / magang / nonaktif", () => {
  assert.deepEqual(hitungKotak(daftar, online), { semua: 4, online: 1, admin: 1, magang: 1, nonaktif: 1 });
  assert.deepEqual(daftar.filter((p) => cocokSaring(p, "magang", online)).map((p) => p.nama), ["Ani"]);
});

test("urutan: aktif dulu, yang online paling atas, lalu nama; nonaktif paling bawah", () => {
  assert.deepEqual(urutkanPegawai(daftar, online).map((p) => p.nama), ["Dodi", "Ani", "Budi", "Citra"]);
});

test("cari: nama, email, atau jabatan", () => {
  assert.equal(cocokCari(daftar[1], "humas"), true);
  assert.equal(cocokCari(daftar[1], "B@GMAIL"), true);
  assert.equal(cocokCari(daftar[1], "  "), true);
  assert.equal(cocokCari(daftar[1], "budi"), false);
});

test("divisi: semua, divisi tertentu, tanpa divisi", () => {
  assert.equal(cocokDivisi(daftar[2], "semua"), true);
  assert.equal(cocokDivisi(daftar[2], TANPA_DIVISI), true);
  assert.equal(cocokDivisi(daftar[0], TANPA_DIVISI), false);
  assert.equal(cocokDivisi(daftar[0], "d1"), true);
});

test("selesaiMagang: n bulan dari tanggal mulai (sehari sebelum tanggal yang sama n bulan kemudian)", () => {
  assert.equal(selesaiMagang("2026-09-01", 6), "2027-02-28");
  assert.equal(selesaiMagang("2026-09-01", 3), "2026-11-30");
  assert.equal(selesaiMagang("2026-11-11", 12), "2027-11-10");
  assert.equal(selesaiMagang("2026-08-31", 6), "2027-02-27", "31 Agu + 6 bln tidak loncat ke Maret");
  assert.equal(selesaiMagang("2027-12-15", 3), "2028-03-14", "lintas tahun");
});

test("batasMagang: ±2 tahun, satu masa magang paling lama 2 tahun", () => {
  const b = batasMagang("2026-11-11", { mulai: null, selesai: null });
  assert.equal(b.min, tambahHari("2026-11-11", -730));
  assert.equal(b.max, tambahHari("2026-11-11", 730));
  assert.equal(batasMagang("2026-11-11", { mulai: "2025-01-01", selesai: null }).max, tambahHari("2025-01-01", 730));
});

test("form tambah pegawai: nama & email Google wajib benar", () => {
  assert.match(cekPegawaiBaru("", "a@gmail.com") ?? "", /nama/);
  assert.match(cekPegawaiBaru("Budi", "budi@") ?? "", /Email/);
  assert.equal(cekPegawaiBaru("Budi", " budi@gmail.com "), null);
});

test("foto profil Google dibuka versi besar; foto unggahan apa adanya", () => {
  assert.equal(fotoBesar("https://lh3.googleusercontent.com/a/ACg8=s96-c"), "https://lh3.googleusercontent.com/a/ACg8=s800-c");
  assert.equal(fotoBesar("https://lh3.googleusercontent.com/a/ACg8"), "https://lh3.googleusercontent.com/a/ACg8");
  const unggahan = "https://x.supabase.co/storage/v1/object/public/avatar/u1/foto-1.jpg";
  assert.equal(fotoBesar(unggahan), unggahan);
});

test("inisial nama", () => {
  assert.equal(inisial("Moch Farid Sahila"), "MS");
  assert.equal(inisial("budi"), "B");
  assert.equal(inisial("  "), "?");
});

test("migrasi 0044 mengunci kolom yang hanya boleh diubah admin, aturan super admin tetap", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0044_proteksi_profil_lengkap.sql", import.meta.url), "utf8");
  for (const kolom of ["role", "aktif", "wajib_absen", "tanggal_mulai_magang", "tanggal_selesai_magang"]) {
    assert.match(sql, new RegExp(`new\\.${kolom} := old\\.${kolom};`), kolom);
  }
  assert.match(sql, /not is_super_admin\(\) then\s+new\.super_admin := old\.super_admin;/);
});
