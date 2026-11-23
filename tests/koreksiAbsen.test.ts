import { test } from "node:test";
import assert from "node:assert/strict";
import {
  geserSegmen,
  isiSegmen,
  jamSekarangWib,
  keIsoWib,
  keJamWib,
  normalJam,
  pathFotoKoreksi,
  pecahJam,
  tampilJam,
} from "../src/lib/koreksiAbsenAturan.ts";

test("normalJam melengkapi detik & menolak jam tidak sah", () => {
  assert.equal(normalJam("07:30"), "07:30:00");
  assert.equal(normalJam("7:5"), "07:05:00");
  assert.equal(normalJam("07:30:45"), "07:30:45");
  assert.equal(normalJam("07.30.45"), "07:30:45");
  assert.equal(normalJam("16:05:07.123"), "16:05:07");
  assert.equal(normalJam("24:00:00"), "");
  assert.equal(normalJam("07:60"), "");
  assert.equal(normalJam(""), "");
  assert.equal(normalJam(null), "");
  assert.equal(pecahJam("abc"), null);
  assert.deepEqual(pecahJam("08:09:10"), [8, 9, 10]);
});

test("isiSegmen membatasi angka & mulai dari 00:00:00 kalau kosong", () => {
  assert.equal(isiSegmen("", 2, 45), "00:00:45");
  assert.equal(isiSegmen("07:30:00", 0, 99), "23:30:00");
  assert.equal(isiSegmen("07:30:00", 1, 75), "07:59:00");
  assert.equal(isiSegmen("07:30:00", 2, -3), "07:30:00");
});

test("geserSegmen berputar tanpa mengubah bagian lain", () => {
  assert.equal(geserSegmen("07:30:59", 2, 1), "07:30:00");
  assert.equal(geserSegmen("07:30:00", 2, -1), "07:30:59");
  assert.equal(geserSegmen("23:00:00", 0, 1), "00:00:00");
  assert.equal(geserSegmen("00:00:00", 0, -1), "23:00:00");
  assert.equal(geserSegmen("07:30:10", 2, 25), "07:30:35");
  assert.equal(geserSegmen("07:30:10", 2, -70), "07:30:00");
  assert.equal(geserSegmen("", 1, 1), "00:01:00");
});

test("konversi WIB sampai detik", () => {
  assert.equal(keIsoWib("2026-11-18", "07:29:59"), "2026-11-18T07:29:59+07:00");
  assert.equal(keIsoWib("2026-11-18", "07:30"), "2026-11-18T07:30:00+07:00");
  assert.equal(keIsoWib("2026-11-18", ""), null);
  assert.equal(keJamWib("2026-11-18T00:29:59.000Z"), "07:29:59");
  assert.equal(keJamWib("2026-11-18T17:00:00+00:00"), "00:00:00"); // tengah malam WIB = 00, bukan 24
  assert.equal(keJamWib(null), "");
  assert.equal(jamSekarangWib(Date.UTC(2026, 10, 18, 9, 5, 7)), "16:05:07");
  assert.equal(tampilJam("07:30:45"), "07.30.45");
});

test("path foto koreksi berada di folder pegawai", () => {
  assert.equal(
    pathFotoKoreksi("bbbb", "2026-11-18", "masuk", "abc"),
    "bbbb/2026-11-18/masuk-koreksi-abc.jpg"
  );
});
