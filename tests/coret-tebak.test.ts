// Jalankan: npm test   (node --test, tanpa dependensi tambahan — Node ≥ 23
// bisa langsung menjalankan TypeScript dengan menghapus anotasi tipenya)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  faseBerikut,
  infoRonde,
  jarakEdit,
  kotakPetunjuk,
  nilaiTebakan,
  normalTebakan,
  peringkat,
  poinPenebak,
  poinPenggambar,
  tebakanCocok,
} from "../src/features/game/logika.ts";

test("normalisasi tebakan", () => {
  assert.equal(normalTebakan("  Kupu-Kupu!! "), "kupu kupu");
  assert.equal(normalTebakan("ES   KRIM"), "es krim");
  assert.equal(normalTebakan("tugu_jogja."), "tugu jogja");
});

test("tebakan cocok tanpa peduli spasi & tanda baca", () => {
  assert.ok(tebakanCocok("Kupu-kupu", "kupu kupu"));
  assert.ok(tebakanCocok("kupukupu", "kupu kupu"));
  assert.ok(tebakanCocok("TUGU", "tugu"));
  assert.ok(!tebakanCocok("tugu jogja", "tugu"));
});

test("jarak edit", () => {
  assert.equal(jarakEdit("gunung", "gunung"), 0);
  assert.equal(jarakEdit("gunung", "gunang"), 1);
  assert.equal(jarakEdit("", "abc"), 3);
  assert.equal(jarakEdit("kucing", "kucin"), 1);
});

test("status tebakan benar / hampir / salah", () => {
  assert.equal(nilaiTebakan("Becak", "becak"), "benar");
  assert.equal(nilaiTebakan("becek", "becak"), "hampir");
  assert.equal(nilaiTebakan("bec", "becak"), "salah");
  assert.equal(nilaiTebakan("jam", "jas"), "salah", "kata < 4 huruf tidak pernah 'hampir'");
  assert.equal(nilaiTebakan("kebun binatnag", "kebun binatang"), "hampir", "kata panjang boleh beda 2");
});

test("poin penebak", () => {
  assert.equal(poinPenebak(60, 60, false), 400);
  assert.equal(poinPenebak(60, 60, true), 450);
  assert.equal(poinPenebak(30, 60, false), 250);
  assert.equal(poinPenebak(0, 60, false), 100);
  assert.equal(poinPenebak(-5, 60, false), 100);
  assert.equal(poinPenebak(45, 90, true), 300);
});

test("poin penggambar", () => {
  assert.equal(poinPenggambar(0, 3), 0);
  assert.equal(poinPenggambar(2, 3), 100);
  assert.equal(poinPenggambar(3, 3), 250);
  assert.equal(poinPenggambar(0, 0), 0);
});

test("peringkat: skor sama = peringkat sama", () => {
  const hasil = peringkat([
    { id: "a", skor: 300 },
    { id: "b", skor: 500 },
    { id: "c", skor: 300 },
    { id: "d", skor: 100 },
  ]);
  assert.deepEqual(
    hasil.map((h) => [h.id, h.posisi]),
    [["b", 1], ["a", 2], ["c", 2], ["d", 4]]
  );
});

test("info ronde", () => {
  assert.deepEqual(infoRonde(6, 2, 0), { ronde: 1, total: 2 });
  assert.deepEqual(infoRonde(6, 2, 2), { ronde: 1, total: 2 });
  assert.deepEqual(infoRonde(6, 2, 3), { ronde: 2, total: 2 });
  assert.deepEqual(infoRonde(6, 2, 5), { ronde: 2, total: 2 });
});

const normal = { tenggatLewat: false, penggambarAda: true, semuaBenar: false, masihAdaGiliran: true, pemainOnline: 3 };

test("transisi fase", () => {
  assert.equal(faseBerikut("menunggu", normal), "menunggu");
  assert.equal(faseBerikut("memilih", normal), "memilih");
  assert.equal(faseBerikut("memilih", { ...normal, tenggatLewat: true }), "menggambar", "kata dipilih acak");
  assert.equal(faseBerikut("memilih", { ...normal, penggambarAda: false }), "memilih", "lewati ke giliran berikut");
  assert.equal(faseBerikut("menggambar", normal), "menggambar");
  assert.equal(faseBerikut("menggambar", { ...normal, semuaBenar: true }), "reveal", "selesai lebih awal");
  assert.equal(faseBerikut("menggambar", { ...normal, tenggatLewat: true }), "reveal");
  assert.equal(faseBerikut("menggambar", { ...normal, penggambarAda: false }), "reveal");
  assert.equal(faseBerikut("reveal", normal), "reveal");
  assert.equal(faseBerikut("reveal", { ...normal, tenggatLewat: true }), "memilih");
  assert.equal(faseBerikut("reveal", { ...normal, tenggatLewat: true, masihAdaGiliran: false }), "selesai");
  assert.equal(faseBerikut("menggambar", { ...normal, pemainOnline: 1 }), "selesai", "sisa satu pemain");
});

test("kotak petunjuk", () => {
  assert.deepEqual(kotakPetunjuk("t__u"), ["t", "", "", "u"]);
  assert.deepEqual(kotakPetunjuk("__ _"), ["", "", null, ""]);
});
