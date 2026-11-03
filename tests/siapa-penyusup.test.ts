// Jalankan: npm test   (node --test, tanpa dependensi tambahan — Node ≥ 23
// bisa langsung menjalankan TypeScript dengan menghapus anotasi tipenya)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aksiGabung,
  BATAS,
  bisaMulai,
  bolehKeluarkan,
  geser,
  hostBerikut,
  HURUF_KODE,
  jumlahPenyusupOtomatis,
  jumlahPenyusupValid,
  kodeValid,
  nomorWarnaDivisi,
  penyusupDipakai,
  rapikanKode,
} from "../src/features/siapa-penyusup/logika.ts";

test("huruf kode tanpa O/0/I/1", () => {
  for (const c of "O0I1") assert.ok(!HURUF_KODE.includes(c));
});

test("rapikan kode: huruf besar, buang karakter asing", () => {
  assert.equal(rapikanKode("prb 25"), "PRB25");
  assert.equal(rapikanKode("a-b_c!"), "ABC");
  // contoh "JOG25" di prototype memuat O, jadi O-nya terbuang
  assert.equal(rapikanKode("jog25"), "JG25");
  assert.equal(rapikanKode("OI01"), "");
});

test("kode valid hanya 5 huruf dari alfabet kode", () => {
  assert.ok(kodeValid("PRB25"));
  assert.ok(!kodeValid("PRB2"));
  assert.ok(!kodeValid("PRB256"));
  assert.ok(!kodeValid("JOG25"));
  assert.ok(!kodeValid("PR 25"));
  assert.ok(!kodeValid("prb25"));
});

test("stepper tetap di dalam batas", () => {
  assert.equal(geser(30, 1, BATAS.waktuPetunjuk), 35);
  assert.equal(geser(60, 1, BATAS.waktuPetunjuk), 60);
  assert.equal(geser(15, -1, BATAS.waktuPetunjuk), 15);
  assert.equal(geser(165, 1, BATAS.waktuDiskusi), 180);
  assert.equal(geser(0, -1, BATAS.jumlahPenyusup), 0);
  assert.equal(geser(3, 1, BATAS.jumlahPenyusup), 3);
});

test("jumlah penyusup otomatis: 1, atau 2 mulai 7 pemain", () => {
  assert.equal(jumlahPenyusupOtomatis(4), 1);
  assert.equal(jumlahPenyusupOtomatis(6), 1);
  assert.equal(jumlahPenyusupOtomatis(7), 2);
  assert.equal(jumlahPenyusupOtomatis(12), 2);
  assert.equal(penyusupDipakai(0, 8), 2);
  assert.equal(penyusupDipakai(3, 8), 3);
});

test("jumlah penyusup harus kurang dari setengah pemain", () => {
  assert.ok(jumlahPenyusupValid(1, 4));
  assert.ok(!jumlahPenyusupValid(2, 4));
  assert.ok(jumlahPenyusupValid(2, 5));
  assert.ok(!jumlahPenyusupValid(3, 6));
  assert.ok(jumlahPenyusupValid(3, 7));
  assert.ok(!jumlahPenyusupValid(0, 8));
});

const roomMenunggu = {
  status: "menunggu" as const,
  mode: "antar_divisi" as const,
  divisiRoom: null,
  divisiSaya: "dv-a",
  jumlahOnline: 3,
  saya: null,
};

test("gabung: pemain baru ke room yang menunggu", () => {
  assert.equal(aksiGabung(roomMenunggu), "gabung");
  assert.equal(aksiGabung({ ...roomMenunggu, jumlahOnline: 12 }), "penuh");
  assert.equal(aksiGabung({ ...roomMenunggu, jumlahOnline: 11 }), "gabung");
  assert.equal(aksiGabung({ ...roomMenunggu, status: "petunjuk" }), "berjalan");
});

test("gabung: mode Satu Divisi hanya untuk divisi yang sama", () => {
  const satu = { ...roomMenunggu, mode: "satu_divisi" as const, divisiRoom: "dv-a" };
  assert.equal(aksiGabung(satu), "gabung");
  assert.equal(aksiGabung({ ...satu, divisiSaya: "dv-b" }), "beda_divisi");
  assert.equal(aksiGabung({ ...satu, divisiSaya: null }), "beda_divisi");
  // divisi room terhapus: tidak ada yang bisa masuk, termasuk user tanpa divisi
  assert.equal(aksiGabung({ ...satu, divisiRoom: null, divisiSaya: null }), "beda_divisi");
});

test("gabung: pemain lama boleh kembali, yang dikeluarkan tidak", () => {
  const berjalan = { ...roomMenunggu, status: "voting" as const, jumlahOnline: 12 };
  assert.equal(aksiGabung({ ...berjalan, saya: { dikeluarkan: false } }), "lanjut");
  assert.equal(aksiGabung({ ...berjalan, saya: { dikeluarkan: true } }), "dikeluarkan");
  assert.equal(aksiGabung({ ...roomMenunggu, saya: { dikeluarkan: true } }), "dikeluarkan");
});

test("kick: hanya host, bukan diri sendiri, target masih aktif", () => {
  assert.ok(bolehKeluarkan("host", "host", { user_id: "b", aktif: true }));
  assert.ok(!bolehKeluarkan("b", "host", { user_id: "c", aktif: true }));
  assert.ok(!bolehKeluarkan("host", "host", { user_id: "host", aktif: true }));
  assert.ok(!bolehKeluarkan("host", "host", { user_id: "b", aktif: false }));
});

test("pindah host: pemain aktif paling lama, utamakan yang online", () => {
  const p = [
    { user_id: "host", aktif: false, online: false, bergabung_at: "2026-11-03T08:00:00Z" },
    { user_id: "dewi", aktif: true, online: false, bergabung_at: "2026-11-03T08:01:00Z" },
    { user_id: "budi", aktif: true, online: true, bergabung_at: "2026-11-03T08:03:00Z" },
    { user_id: "sari", aktif: true, online: true, bergabung_at: "2026-11-03T08:02:00Z" },
  ];
  assert.equal(hostBerikut(p, "host"), "sari");
  // semua offline: tetap yang paling lama
  assert.equal(hostBerikut(p.map((x) => ({ ...x, online: false })), "host"), "dewi");
  // host masih yang terbaik: tidak berubah
  assert.equal(hostBerikut([{ ...p[0], aktif: true, online: true }, p[2]], "host"), null);
  assert.equal(hostBerikut([], "host"), null);
});

test("mulai: host dan minimal 4 pemain online", () => {
  assert.ok(bisaMulai(true, 4));
  assert.ok(!bisaMulai(true, 3));
  assert.ok(!bisaMulai(false, 12));
});

test("warna divisi mengikuti urutan divisi, berulang tiap 8", () => {
  const urutan = ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9"];
  assert.equal(nomorWarnaDivisi("d1", urutan), 1);
  assert.equal(nomorWarnaDivisi("d8", urutan), 8);
  assert.equal(nomorWarnaDivisi("d9", urutan), 1);
  assert.equal(nomorWarnaDivisi(null, urutan), null);
  assert.equal(nomorWarnaDivisi("hilang", urutan), null);
});
