// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  batasRekap,
  bulanPenuh,
  geserPeriode,
  keEntriPeringkat,
  periodeCepat,
  saringTim,
  skorKerajinan,
  susunTim,
  totalTim,
  type PegawaiRekap,
} from "../src/lib/rekapTimAturan.ts";

const HARI_INI = "2026-11-12"; // Kamis
const P = (id: string, nama: string, lain: Partial<PegawaiRekap> = {}): PegawaiRekap => ({
  id,
  nama,
  foto_url: null,
  divisi_id: "d1",
  jabatan: null,
  aktif: true,
  wajib_absen: true,
  created_at: "2026-01-05T02:00:00Z",
  tanggal_mulai_magang: null,
  tanggal_selesai_magang: null,
  ...lain,
});
const B = (user_id: string, tanggal: string, status: string, masuk: string | null = "08:00", keluar: string | null = "16:00") => ({
  user_id,
  tanggal,
  status,
  masuk_at: masuk && `${tanggal}T${masuk}:00+07:00`,
  keluar_at: keluar && `${tanggal}T${keluar}:00+07:00`,
});
// hari kerja 9–12 Nov (Senin–Kamis); hari ini (12) belum dihitung kalau belum absen
const HARI = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"];

test("skorKerajinan: hadir/dinas = 1, telat/izin = ½, tidak absen = 0", () => {
  assert.equal(skorKerajinan({ hadir: 4, dinas: 0, telat: 0, izin: 0, tidak: 0 }, 4), 100);
  assert.equal(skorKerajinan({ hadir: 2, dinas: 0, telat: 1, izin: 1, tidak: 0 }, 4), 75);
  assert.equal(skorKerajinan({ hadir: 1, dinas: 1, telat: 0, izin: 0, tidak: 2 }, 4), 50);
  assert.equal(skorKerajinan({ hadir: 0, dinas: 0, telat: 0, izin: 0, tidak: 0 }, 0), null);
});

test("susunTim: terajin dulu, tidak wajib absen di bawah tanpa skor", () => {
  const pegawai = [P("a", "Ani"), P("b", "Budi"), P("c", "Citra", { wajib_absen: false }), P("d", "Dodi")];
  const rows = [
    ...HARI.map((t) => B("a", t, "hadir")),
    B("b", HARI[0], "telat"),
    B("b", HARI[1], "hadir"),
    B("b", HARI[2], "izin", null, null),
    B("c", HARI[0], "hadir"),
    B("d", HARI[0], "hadir"),
  ];
  const tim = susunTim(rows, pegawai, "2026-11-09", "2026-11-15", HARI_INI);
  assert.deepEqual(
    tim.map((e) => [e.p.nama, e.skor]),
    [
      ["Ani", 100],
      ["Budi", 67],
      ["Dodi", 33],
      ["Citra", null],
    ]
  );
  // Dodi: 9 hadir, 10 & 11 tidak absen, 12 = hari ini belum absen (tidak dihitung)
  assert.deepEqual(tim[2].ringkas.hitung, { hadir: 1, telat: 0, dinas: 0, izin: 0, tidak: 2 });
  const t = totalTim(tim.filter((e) => e.wajib));
  assert.deepEqual(t.hitung, { hadir: 6, telat: 1, dinas: 0, izin: 1, tidak: 2 });
  assert.equal(t.persen, 70);
  assert.equal(t.menitKerja, 7 * 8 * 60, "Ani 4 hari + Budi 2 hari + Dodi 1 hari (Citra tidak wajib, tidak dihitung)");
});

test("pegawai baru tidak dihukum untuk hari sebelum terdaftar", () => {
  const tim = susunTim([B("n", HARI[2], "hadir")], [P("n", "Baru", { created_at: "2026-11-11T01:00:00Z" })], "2026-11-01", "2026-11-30", HARI_INI);
  assert.equal(tim[0].skor, 100);
  assert.equal(tim[0].ringkas.hariWajib, 1);
});

test("saringTim: kotak diketuk → yang punya hari jenis itu, terbanyak dulu", () => {
  const tim = susunTim(
    [B("a", HARI[0], "telat"), B("b", HARI[0], "telat"), B("b", HARI[1], "telat"), B("c", HARI[0], "hadir")],
    [P("a", "Ani"), P("b", "Budi"), P("c", "Citra")],
    "2026-11-09",
    "2026-11-10",
    HARI_INI
  );
  assert.deepEqual(saringTim(tim, "telat").map((e) => e.p.nama), ["Budi", "Ani"]);
  assert.equal(saringTim(tim, null).length, 3);
});

test("keEntriPeringkat: bentuk untuk podium & gambar peringkat", () => {
  const [e] = susunTim([B("a", HARI[0], "dinas_luar")], [P("a", "Ani")], "2026-11-09", "2026-11-09", HARI_INI);
  assert.deepEqual(keEntriPeringkat(e), { id: "a", nama: "Ani", foto_url: null, hadir: 0, dinasLuar: 1, telat: 0, izin: 0, tidakAbsen: 0, skor: 100 });
});

test("periode: sebulan penuh digeser per bulan, rentang lain sepanjang rentangnya", () => {
  assert.equal(bulanPenuh("2026-11-01", "2026-11-30"), true);
  assert.equal(bulanPenuh("2026-11-01", "2026-11-29"), false);
  assert.deepEqual(geserPeriode("2026-11-01", "2026-11-30", -1), { dari: "2026-10-01", sampai: "2026-10-31" });
  assert.deepEqual(geserPeriode("2026-12-01", "2026-12-31", 1), { dari: "2027-01-01", sampai: "2027-01-31" });
  assert.deepEqual(geserPeriode("2026-11-09", "2026-11-15", -1), { dari: "2026-11-02", sampai: "2026-11-08" });
});

test("periode cepat & batas kalender", () => {
  const c = Object.fromEntries(periodeCepat(HARI_INI).map((x) => [x.id, [x.dari, x.sampai]]));
  assert.deepEqual(c.minggu, ["2026-11-09", "2026-11-15"]);
  assert.deepEqual(c.bulan, ["2026-11-01", "2026-11-30"]);
  assert.deepEqual(c.lalu, ["2026-10-01", "2026-10-31"]);
  assert.deepEqual(c.tahun, ["2026-01-01", "2026-12-31"]);
  assert.equal(batasRekap(HARI_INI, { mulai: null, selesai: null }).max, "2026-11-30");
  assert.equal(batasRekap(HARI_INI, { mulai: "2026-01-01", selesai: null }).max, "2026-11-30");
  assert.equal(batasRekap(HARI_INI, { mulai: "2025-01-01", selesai: null }).max, "2026-01-01");
});
