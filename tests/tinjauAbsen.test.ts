// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAKS_HARI_TINJAU,
  batasTinjau,
  hariSeminggu,
  hitungKategori,
  kategoriStatus,
  labelRentang,
  rentangCepat,
  seninDari,
  susunKartu,
  tanggalWIB,
  wajibPadaTanggal,
  type PegawaiTinjau,
} from "../src/lib/tinjauAbsenAturan.ts";
import { tambahHari } from "../src/lib/izinAturan.ts";

// 2026-11-11 = Rabu
const HARI_INI = "2026-11-11";

const peg = (id: string, nama: string, lain: Partial<PegawaiTinjau> = {}): PegawaiTinjau => ({
  id,
  nama,
  divisi_id: "d1",
  foto_url: null,
  aktif: true,
  wajib_absen: true,
  created_at: "2026-01-01T00:00:00Z",
  tanggal_mulai_magang: null,
  tanggal_selesai_magang: null,
  ...lain,
});

const baris = (id: string, user_id: string, tanggal: string, status: string, nama?: string) => ({
  id,
  user_id,
  tanggal,
  status,
  profiles: nama ? { nama, divisi_id: "d1" } : null,
});

test("kategori: dinas luar dihitung hadir, telat kuning, izin merah", () => {
  assert.equal(kategoriStatus("hadir"), "hadir");
  assert.equal(kategoriStatus("dinas_luar"), "hadir");
  assert.equal(kategoriStatus("telat"), "telat");
  assert.equal(kategoriStatus("izin"), "izin");
});

test("tanggalWIB: created_at pukul 06.00 WIB (23.00 UTC kemarin) jatuh di tanggal WIB", () => {
  assert.equal(tanggalWIB("2026-11-10T23:00:00Z"), "2026-11-11");
  assert.equal(tanggalWIB("2026-11-10T16:59:59Z"), "2026-11-10");
});

test("wajibPadaTanggal: hanya pegawai aktif, wajib absen, hari kerja, dalam masa kerja", () => {
  assert.equal(wajibPadaTanggal(peg("a", "A"), HARI_INI), true);
  assert.equal(wajibPadaTanggal(peg("a", "A"), "2026-11-14"), false, "Sabtu");
  assert.equal(wajibPadaTanggal(peg("a", "A", { wajib_absen: false }), HARI_INI), false);
  assert.equal(wajibPadaTanggal(peg("a", "A", { aktif: false }), HARI_INI), false);
  assert.equal(wajibPadaTanggal(peg("a", "A", { created_at: "2026-11-11T02:00:00Z" }), "2026-11-10"), false, "belum terdaftar");
  assert.equal(wajibPadaTanggal(peg("a", "A", { tanggal_mulai_magang: "2026-11-12" }), HARI_INI), false);
  assert.equal(wajibPadaTanggal(peg("a", "A", { tanggal_selesai_magang: "2026-11-10" }), HARI_INI), false);
  assert.equal(wajibPadaTanggal(peg("a", "A", { tanggal_selesai_magang: HARI_INI }), HARI_INI), true);
});

test("susunKartu: yang belum absen muncul sebagai kartu hitam, urut belum → telat → izin → hadir", () => {
  const pegawai = [peg("a", "Budi"), peg("b", "Ani"), peg("c", "Citra"), peg("d", "Dodi"), peg("e", "Eka", { wajib_absen: false })];
  const rows = [
    baris("r1", "a", HARI_INI, "hadir", "Budi"),
    baris("r2", "b", HARI_INI, "telat", "Ani"),
    baris("r3", "c", HARI_INI, "izin", "Citra"),
  ];
  const kartu = susunKartu(rows, pegawai, HARI_INI, HARI_INI, HARI_INI);
  assert.deepEqual(
    kartu.map((k) => [k.nama, k.kategori]),
    [
      ["Dodi", "belum"],
      ["Ani", "telat"],
      ["Citra", "izin"],
      ["Budi", "hadir"],
    ]
  );
  assert.equal(kartu[0].row, null);
  assert.equal(kartu[0].kunci, `belum:d:${HARI_INI}`);
  assert.deepEqual(hitungKategori(kartu), { semua: 4, hadir: 1, telat: 1, izin: 1, belum: 1 });
});

test("susunKartu: pegawai tidak wajib absen tetap tampil kalau absen", () => {
  const kartu = susunKartu([baris("r1", "e", HARI_INI, "hadir", "Eka")], [peg("e", "Eka", { wajib_absen: false })], HARI_INI, HARI_INI, HARI_INI);
  assert.deepEqual(kartu.map((k) => k.kategori), ["hadir"]);
});

test("susunKartu: rentang — akhir pekan & hari mendatang tidak dihitung belum absen; tanggal terbaru dulu", () => {
  // Jumat 6 Nov – Jumat 13 Nov; hari ini Rabu 11 Nov
  const kartu = susunKartu([baris("iz", "a", "2026-11-13", "izin", "Budi")], [peg("a", "Budi")], "2026-11-06", "2026-11-13", HARI_INI);
  assert.deepEqual(
    kartu.map((k) => [k.tanggal, k.kategori]),
    [
      ["2026-11-13", "izin"], // izin yang sudah diajukan untuk hari mendatang tetap tampil
      ["2026-11-11", "belum"],
      ["2026-11-10", "belum"],
      ["2026-11-09", "belum"],
      ["2026-11-06", "belum"],
    ]
  );
});

test("susunKartu: nama diambil dari daftar pegawai kalau join profiles kosong; baris di luar rentang dibuang", () => {
  const kartu = susunKartu(
    [baris("r1", "a", HARI_INI, "hadir"), baris("r0", "a", "2026-11-01", "hadir")],
    [peg("a", "Budi")],
    HARI_INI,
    HARI_INI,
    HARI_INI
  );
  assert.equal(kartu.length, 1);
  assert.equal(kartu[0].nama, "Budi");
});

test("seninDari & hariSeminggu: minggu Senin–Minggu", () => {
  assert.equal(seninDari(HARI_INI), "2026-11-09");
  assert.equal(seninDari("2026-11-09"), "2026-11-09");
  assert.equal(seninDari("2026-11-15"), "2026-11-09", "Minggu ikut minggu sebelumnya");
  assert.deepEqual(hariSeminggu("2026-11-09"), [
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
  ]);
});

test("rentangCepat", () => {
  assert.deepEqual(rentangCepat("hari_ini", HARI_INI), { mulai: HARI_INI, selesai: HARI_INI });
  assert.deepEqual(rentangCepat("kemarin", HARI_INI), { mulai: "2026-11-10", selesai: "2026-11-10" });
  assert.deepEqual(rentangCepat("minggu_ini", HARI_INI), { mulai: "2026-11-09", selesai: HARI_INI });
  assert.deepEqual(rentangCepat("tujuh_hari", HARI_INI), { mulai: "2026-11-05", selesai: HARI_INI });
  assert.deepEqual(rentangCepat("bulan_ini", HARI_INI), { mulai: "2026-11-01", selesai: HARI_INI });
});

test("batasTinjau: saat memilih tanggal akhir, paling panjang 31 hari", () => {
  const luar = batasTinjau(HARI_INI, { mulai: null, selesai: null });
  assert.equal(luar.max, tambahHari(HARI_INI, 60));
  const b = batasTinjau(HARI_INI, { mulai: "2026-10-01", selesai: null });
  assert.equal(b.max, tambahHari("2026-10-01", MAKS_HARI_TINJAU - 1));
});

test("labelRentang", () => {
  assert.equal(labelRentang(HARI_INI, HARI_INI, HARI_INI).ket, "Hari ini");
  assert.equal(labelRentang("2026-11-10", "2026-11-10", HARI_INI).ket, "Kemarin");
  assert.equal(labelRentang("2026-11-14", "2026-11-14", HARI_INI).ket, "Akhir pekan");
  assert.match(labelRentang(HARI_INI, HARI_INI, HARI_INI).judul, /11 November 2026/);
  const r = labelRentang("2026-11-09", "2026-11-15", HARI_INI);
  assert.equal(r.ket, "7 hari · 5 hari kerja");
  assert.match(r.judul, /9 .*15 .*2026/);
});
