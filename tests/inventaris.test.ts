// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  daftarKategori,
  isiLog,
  jamWIB,
  kalimatLog,
  kelompokPerTanggal,
  labelTanggal,
  pathFotoKecil,
  rincianPerubahan,
  ringkasan,
  saldoSetelah,
  saranPihak,
  saringBarang,
  statusStok,
  stokSetelah,
  tersediaUntukKeluar,
  urutTerbaru,
  validasiBarang,
  validasiMutasi,
} from "../src/lib/inventarisAturan.ts";
import type { BarangInventaris, LogInventaris, MutasiInventaris } from "../src/types/database.ts";

const barang = (b: Partial<BarangInventaris>): BarangInventaris => ({
  id: b.nama ?? "x",
  nama: "x",
  kategori: null,
  satuan: "pcs",
  stok: 10,
  stok_minimum: 0,
  keterangan: null,
  foto_path: null,
  dibuat_oleh: null,
  dibuat_at: "2026-11-01T00:00:00Z",
  diubah_at: "2026-11-01T00:00:00Z",
  dihapus_at: null,
  ...b,
});

const mutasi = (m: Partial<MutasiInventaris>): MutasiInventaris => ({
  id: String(m.urut ?? 1),
  urut: 1,
  barang_id: "b1",
  jenis: "masuk",
  jumlah: 1,
  tanggal: "2026-11-19",
  pihak: null,
  keterangan: null,
  user_id: null,
  dibuat_at: "2026-11-19T02:00:00Z",
  diubah_at: null,
  diubah_oleh: null,
  ...m,
});

const log = (l: Partial<LogInventaris>): LogInventaris => ({
  id: 1,
  aksi: "barang_tambah",
  barang_id: "b1",
  mutasi_id: null,
  nama_barang: "Kaos Tugu",
  jenis: null,
  sebelum: null,
  sesudah: null,
  user_id: null,
  dibuat_at: "2026-11-19T02:00:00Z",
  ...l,
});

test("statusStok: habis, menipis (≤ batas), aman; batas 0 = tidak diingatkan", () => {
  assert.equal(statusStok({ stok: 0, stok_minimum: 5 }), "habis");
  assert.equal(statusStok({ stok: 5, stok_minimum: 5 }), "menipis");
  assert.equal(statusStok({ stok: 6, stok_minimum: 5 }), "aman");
  assert.equal(statusStok({ stok: 1, stok_minimum: 0 }), "aman");
});

test("stok setelah form: catatan lama dianggap belum ada saat diubah", () => {
  assert.equal(stokSetelah(30, { jenis: "keluar", jumlah: 10 }), 20);
  assert.equal(stokSetelah(30, { jenis: "masuk", jumlah: 5 }), 35);
  // keluar 20 diubah jadi 25 → stok 30 jadi 25
  assert.equal(tersediaUntukKeluar(30, { jenis: "keluar", jumlah: 20 }), 50);
  assert.equal(stokSetelah(30, { jenis: "keluar", jumlah: 25 }, { jenis: "keluar", jumlah: 20 }), 25);
  // masuk 10 diubah jadi keluar 10
  assert.equal(stokSetelah(30, { jenis: "keluar", jumlah: 10 }, { jenis: "masuk", jumlah: 10 }), 10);
});

test("urutTerbaru & saldoSetelah: dihitung mundur dari stok sekarang", () => {
  const list = urutTerbaru([
    mutasi({ id: "a", urut: 1, tanggal: "2026-11-17", jenis: "masuk", jumlah: 50 }),
    mutasi({ id: "b", urut: 3, tanggal: "2026-11-18", jenis: "keluar", jumlah: 20 }),
    mutasi({ id: "c", urut: 2, tanggal: "2026-11-18", jenis: "masuk", jumlah: 5 }),
    mutasi({ id: "d", urut: 4, tanggal: "2026-11-16", jenis: "masuk", jumlah: 0 + 10 }),
  ]);
  assert.deepEqual(list.map((m) => m.id), ["b", "c", "a", "d"]);
  const saldo = saldoSetelah(list, 45);
  assert.deepEqual([...saldo.entries()], [["b", 45], ["c", 65], ["a", 60], ["d", 10]]);
});

test("saringBarang: cari tanpa peduli huruf besar/aksen, saringan restok & kategori, urut nama", () => {
  const list = [
    barang({ id: "1", nama: "Totebag Batik", kategori: "Totebag", stok: 3, stok_minimum: 5 }),
    barang({ id: "2", nama: "Kaos Tugu", kategori: "Kaos", stok: 40, keterangan: "Ukuran L" }),
    barang({ id: "3", nama: "Café Pin", kategori: "Pin", stok: 0 }),
    barang({ id: "4", nama: "Kaos Malioboro", kategori: "kaos", stok: 12 }),
  ];
  assert.deepEqual(saringBarang(list, "", "semua").map((b) => b.id), ["3", "4", "2", "1"]);
  assert.deepEqual(saringBarang(list, "cafe", "semua").map((b) => b.id), ["3"]);
  assert.deepEqual(saringBarang(list, "kaos l", "semua").map((b) => b.id), ["4", "2"]);
  assert.deepEqual(saringBarang(list, "ukuran", "semua").map((b) => b.id), ["2"]);
  assert.deepEqual(saringBarang(list, "", "restok").map((b) => b.id), ["3", "1"]);
  assert.deepEqual(saringBarang(list, "", "kategori:Kaos").map((b) => b.id), ["4", "2"]);
  assert.deepEqual(daftarKategori(list), [
    { nama: "Kaos", jumlah: 2 },
    { nama: "Pin", jumlah: 1 },
    { nama: "Totebag", jumlah: 1 },
  ]);
});

test("ringkasan: catatan barang yang sudah dihapus tidak dihitung", () => {
  const list = [barang({ id: "1", stok: 0 }), barang({ id: "2", stok: 9 })];
  const r = ringkasan(list, [
    { barang_id: "1", jenis: "keluar", jumlah: 5 },
    { barang_id: "2", jenis: "masuk", jumlah: 9 },
    { barang_id: "terhapus", jenis: "keluar", jumlah: 100 },
  ]);
  assert.deepEqual(r, { jenis: 2, restok: 1, keluarBulanIni: 5, masukBulanIni: 9 });
});

test("saranPihak: sesuai jenis, terbaru dulu, tanpa kembar", () => {
  const list = [
    { jenis: "keluar" as const, pihak: "Pameran JIExpo" },
    { jenis: "masuk" as const, pihak: "Vendor sablon" },
    { jenis: "keluar" as const, pihak: "pameran jiexpo" },
    { jenis: "keluar" as const, pihak: null },
    { jenis: "keluar" as const, pihak: "Tamu Kadis" },
  ];
  assert.deepEqual(saranPihak(list, "keluar"), ["Pameran JIExpo", "Tamu Kadis"]);
  assert.deepEqual(saranPihak(list, "masuk"), ["Vendor sablon"]);
});

test("validasiBarang", () => {
  const f = { nama: "Kaos", kategori: "", satuan: "pcs", stokMinimum: 0, stokAwal: 0, keterangan: "" };
  assert.equal(validasiBarang(f), null);
  assert.equal(validasiBarang({ ...f, nama: " a " }), "Nama barang minimal 2 huruf.");
  assert.equal(validasiBarang({ ...f, nama: "kaos" }, ["KAOS"]), 'Sudah ada barang bernama "kaos".');
  assert.equal(validasiBarang({ ...f, stokAwal: -1 }), "Angka stok tidak valid.");
  assert.equal(validasiBarang({ ...f, stokAwal: 1.5 }), "Angka stok tidak valid.");
});

test("validasiMutasi", () => {
  const f = { jenis: "keluar" as const, jumlah: 5, tanggal: "2026-11-19", pihak: "", keterangan: "" };
  const o = { hariIni: "2026-11-19", tersedia: 5, satuan: "pcs" };
  assert.equal(validasiMutasi(f, o), null);
  assert.equal(validasiMutasi({ ...f, jumlah: 0 }, o), "Jumlah minimal 1.");
  assert.equal(validasiMutasi({ ...f, jumlah: 6 }, o), "Stok tidak cukup. Sisa 5 pcs.");
  assert.equal(validasiMutasi({ ...f, jenis: "masuk", jumlah: 6 }, o), null);
  assert.equal(validasiMutasi({ ...f, tanggal: "2026-11-20" }, o), "Tanggal tidak boleh melewati hari ini.");
  assert.equal(validasiMutasi({ ...f, tanggal: "2025-11-17" }, o), "Tanggal paling lama setahun ke belakang.");
});

test("label tanggal, jam WIB, kelompok per tanggal", () => {
  assert.equal(labelTanggal("2026-11-19", "2026-11-19"), "Hari ini");
  assert.equal(labelTanggal("2026-11-18", "2026-11-19"), "Kemarin");
  assert.equal(labelTanggal("2026-11-16", "2026-11-19"), "Senin, 16 Nov");
  assert.equal(labelTanggal("2025-12-31", "2026-01-02"), "31 Des 2025");
  assert.equal(jamWIB("2026-11-19T02:05:00Z"), "09.05");
  assert.equal(jamWIB("2026-11-19T18:30:00Z"), "01.30");
  const g = kelompokPerTanggal(["2026-11-19", "2026-11-19", "2026-11-17"], (x) => x, "2026-11-19");
  assert.deepEqual(g.map((x) => [x.label, x.isi.length]), [["Hari ini", 2], ["Selasa, 17 Nov", 1]]);
});

test("kalimatLog untuk tiap aksi", () => {
  const keluar = kalimatLog(
    log({ aksi: "mutasi_tambah", jenis: "keluar", sesudah: { jenis: "keluar", jumlah: 1200, satuan: "pcs", pihak: "Pameran", keterangan: "dibawa mobil" } })
  );
  assert.deepEqual(keluar, { kata: "mencatat keluar", jumlah: "1.200 pcs", barang: "Kaos Tugu", detail: "Untuk Pameran · dibawa mobil", nada: "keluar" });
  const masuk = kalimatLog(log({ aksi: "mutasi_tambah", jenis: "masuk", sesudah: { jenis: "masuk", jumlah: 50, satuan: "pcs", pihak: "Vendor", keterangan: null } }));
  assert.equal(masuk.detail, "Dari Vendor");
  assert.equal(masuk.nada, "masuk");
  const ubah = kalimatLog(log({ aksi: "barang_ubah", sebelum: { nama: "A", foto_path: null }, sesudah: { nama: "Kaos Tugu", foto_path: "u/1.jpg" } }));
  assert.equal(ubah.detail, "Diubah: nama, foto");
  const hapus = kalimatLog(log({ aksi: "barang_hapus", sebelum: { nama: "Kaos Tugu", satuan: "box", stok: 3 } }));
  assert.equal(hapus.detail, "Sisa stok saat dihapus: 3 box");
  const ubahMutasi = kalimatLog(
    log({ aksi: "mutasi_ubah", jenis: "keluar", sebelum: { jumlah: 20, satuan: "pcs" }, sesudah: { jumlah: 25, satuan: "pcs" } })
  );
  assert.equal(ubahMutasi.kata, "mengubah catatan keluar");
  assert.equal(ubahMutasi.detail, "jumlah 20 pcs → 25 pcs");
});

test("rincianPerubahan & isiLog", () => {
  assert.deepEqual(
    rincianPerubahan(log({ aksi: "barang_ubah", sebelum: { stok_minimum: 0, keterangan: null, foto_path: "a.jpg" }, sesudah: { stok_minimum: 10, keterangan: "Rak 2", foto_path: null } })),
    [
      { kunci: "stok_minimum", label: "Batas menipis", dari: "Tidak diatur", ke: "10" },
      { kunci: "keterangan", label: "Keterangan", dari: "—", ke: "Rak 2" },
      { kunci: "foto_path", label: "Foto", dari: "Foto lama", ke: "Foto dihapus" },
    ]
  );
  assert.deepEqual(
    rincianPerubahan(log({ aksi: "mutasi_ubah", jenis: "masuk", sebelum: { pihak: "A", tanggal: "2026-11-18", satuan: "pcs" }, sesudah: { pihak: "B", tanggal: "2026-11-19", satuan: "pcs" } })),
    [
      { kunci: "pihak", label: "Dari", dari: "A", ke: "B" },
      { kunci: "tanggal", label: "Tanggal", dari: "18 Nov 2026", ke: "19 Nov 2026" },
    ]
  );
  assert.deepEqual(isiLog(log({ aksi: "mutasi_hapus", jenis: "keluar", sebelum: { jenis: "keluar", jumlah: 5, tanggal: "2026-11-19", pihak: "Tamu", keterangan: null, satuan: "pcs" } })), [
    { label: "Jenis", nilai: "Keluar" },
    { label: "Jumlah", nilai: "5 pcs" },
    { label: "Tanggal", nilai: "19 Nov 2026" },
    { label: "Untuk", nilai: "Tamu" },
  ]);
});

test("pathFotoKecil", () => {
  assert.equal(pathFotoKecil("u1/abc.jpg"), "u1/abc-kecil.jpg");
});
