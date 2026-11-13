// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bolehLanjut,
  cekLokasi,
  formatJarak,
  jarakMeter,
  jelaskanGagal,
  riwayatDinas,
  sisipkanAlasan,
  titikRadar,
  waktuAbsen,
  type AturanKantor,
} from "../src/lib/absenAturan.ts";

// Kamis 12 Nov 2026; jam kantor 08.00–16.00 WIB; kantor di Tugu Jogja
const T = "2026-11-12";
const wib = (hhmm: string) => Date.parse(`${T}T${hhmm}:00+07:00`);
const KANTOR: AturanKantor = { lat: -7.7829, lng: 110.3671, radius: 100, akurasiMaks: 100, jamMasuk: "08:00:00", jamPulang: "16:00:00" };
/** titik `utara` m ke utara dan `timur` m ke timur dari kantor */
const geser = (utara: number, timur: number, akurasi = 10) => ({
  lat: KANTOR.lat! + utara / 111195,
  lng: KANTOR.lng! + timur / (111195 * Math.cos((KANTOR.lat! * Math.PI) / 180)),
  akurasi,
});

test("jarak sama dengan rumus server (acos bola 6.371 km)", () => {
  assert.equal(jarakMeter(0, 0, 0, 0), 0);
  const satuDerajat = jarakMeter(0, 0, 0, 1);
  assert.ok(Math.abs(satuDerajat - 111195) < 1, `${satuDerajat}`);
  const d = cekLokasi(geser(60, 0), KANTOR).jarak!;
  assert.ok(Math.abs(d - 60) < 0.5, `${d}`);
});

test("format jarak: meter, km berkoma, km bulat", () => {
  assert.equal(formatJarak(44.6), "45 m");
  assert.equal(formatJarak(1234), "1,2 km");
  assert.equal(formatJarak(152_400), "152 km");
});

test("cek lokasi: dalam / luar radius, akurasi, kantor belum diatur", () => {
  const dekat = cekLokasi(geser(50, 30), KANTOR);
  assert.equal(dekat.dalamRadius, true);
  assert.equal(dekat.akurasiOk, true);
  assert.ok(dekat.utara > 49 && dekat.timur > 29, "arah utara-timur benar");
  const jauh = cekLokasi(geser(-300, 0, 150), KANTOR);
  assert.equal(jauh.dalamRadius, false);
  assert.equal(jauh.akurasiOk, false);
  const tanpa = cekLokasi(geser(0, 0), { ...KANTOR, lat: null, lng: null });
  assert.equal(tanpa.kantorAda, false);
  assert.equal(tanpa.jarak, null);
  assert.equal(cekLokasi(null, KANTOR).dalamRadius, null);
});

test("radar: utara ke atas, timur ke kanan, posisi jauh dijepit di tepi", () => {
  const p = titikRadar(cekLokasi(geser(100, 0), KANTOR), 100, 30, 44);
  assert.ok(Math.abs(p.x) < 0.1 && Math.abs(p.y + 30) < 0.2 && !p.diluar, JSON.stringify(p));
  const t = titikRadar(cekLokasi(geser(0, 50), KANTOR), 100, 30, 44);
  assert.ok(Math.abs(t.x - 15) < 0.2 && Math.abs(t.y) < 0.1);
  const jauh = titikRadar(cekLokasi(geser(0, -5000), KANTOR), 100, 30, 44);
  assert.equal(jauh.diluar, true);
  assert.ok(Math.abs(jauh.x + 44) < 0.01, "dijepit di tepi barat");
});

test("waktu masuk: tepat waktu (hitung mundur), telat (dibulatkan ke atas), dinas luar", () => {
  const pagi = waktuAbsen("masuk", "kantor", wib("07:48"), T, KANTOR);
  assert.deepEqual(pagi.chip, { teks: "Tepat waktu", nada: "hijau" });
  assert.equal(pagi.ket, "Jadwal masuk 08.00 · 12m lagi");
  assert.equal(pagi.saran, null);
  const telat = waktuAbsen("masuk", "kantor", wib("08:00") + 30_000, T, KANTOR);
  assert.equal(telat.chip!.teks, "Telat 1m", "lewat 30 detik sudah telat (sama dengan server)");
  assert.equal(telat.saran, "telat");
  assert.equal(waktuAbsen("masuk", "kantor", wib("09:15"), T, KANTOR).chip!.teks, "Telat 1j 15m");
  const dinas = waktuAbsen("masuk", "luar", wib("09:15"), T, KANTOR);
  assert.equal(dinas.chip!.teks, "Dinas Luar");
  assert.equal(dinas.saran, null);
  assert.equal(waktuAbsen("masuk", "kantor", wib("09:00"), T, null).chip, null);
});

test("waktu pulang: pulang awal menyarankan keterangan; lewat jadwal = waktunya pulang", () => {
  const awal = waktuAbsen("pulang", "kantor", wib("15:30"), T, KANTOR);
  assert.equal(awal.chip!.teks, "Pulang awal 30m");
  assert.equal(awal.saran, "awal");
  const pas = waktuAbsen("pulang", "kantor", wib("16:05"), T, KANTOR);
  assert.deepEqual(pas.chip, { teks: "Waktunya pulang", nada: "hijau" });
  assert.equal(pas.ket, "Jadwal pulang 16.00");
});

test("boleh lanjut ke kamera hanya kalau lokasi masuk akal", () => {
  const cek = (p: ReturnType<typeof geser> | null, k: AturanKantor | null = KANTOR) => cekLokasi(p, k);
  assert.equal(bolehLanjut("kantor", null, cek(null), KANTOR, "").boleh, false);
  const dekat = geser(20, 0);
  assert.deepEqual(bolehLanjut("kantor", dekat, cek(dekat), KANTOR, ""), { boleh: true, alasan: null });
  const jauh = geser(400, 0);
  assert.match(bolehLanjut("kantor", jauh, cek(jauh), KANTOR, "").alasan!, /Dinas Luar/);
  assert.equal(bolehLanjut("luar", jauh, cek(jauh), KANTOR, "Survei").boleh, true, "dinas luar boleh di mana saja");
  assert.match(bolehLanjut("luar", jauh, cek(jauh), KANTOR, "abc").alasan!, /min\. 5/);
  const kabur = geser(10, 0, 250);
  assert.match(bolehLanjut("kantor", kabur, cek(kabur), KANTOR, "").alasan!, /±250 m/);
  const tanpaTitik = { ...KANTOR, lat: null, lng: null };
  assert.match(bolehLanjut("kantor", dekat, cek(dekat, tanpaTitik), tanpaTitik, "").alasan!, /belum diatur/);
  assert.equal(bolehLanjut("kantor", dekat, cek(dekat, null), null, "").boleh, true, "pengaturan gagal dimuat: server yang memutuskan");
});

test("pesan galat server diterjemahkan ke tombol yang membantu", () => {
  assert.equal(jelaskanGagal('Lokasi terlalu jauh dari kantor (420 m). Pilih "Dinas Luar" bila memang di luar.').aksi, "dinas");
  assert.equal(jelaskanGagal("Lokasi kurang akurat. Aktifkan GPS").aksi, "lokasi");
  assert.equal(jelaskanGagal("Kamu sudah absen masuk hari ini").aksi, "beranda");
  assert.equal(jelaskanGagal("Gagal mengunggah foto. Periksa koneksi internet kamu.").aksi, "ulang");
  assert.equal(jelaskanGagal("Failed to fetch").aksi, "ulang");
});

test("riwayat dinas luar: unik (abaikan huruf besar), terbaru dulu, maks 3", () => {
  const r = riwayatDinas([
    { masuk_catatan: "Survei Kaliurang", keluar_catatan: "survei kaliurang" },
    { masuk_catatan: "  ", keluar_catatan: null },
    { masuk_catatan: "Rapat Dinas Kominfo", keluar_catatan: "Rpt" },
    { masuk_catatan: "Pameran di JEC", keluar_catatan: null },
    { masuk_catatan: "Lainnya lagi", keluar_catatan: null },
  ]);
  assert.deepEqual(r, ["Survei Kaliurang", "Rapat Dinas Kominfo", "Pameran di JEC"], "terlalu pendek dibuang");
});

test("chip alasan: isi kosong diganti, isi ada ditambah, tidak dobel", () => {
  assert.equal(sisipkanAlasan("", "Macet di jalan"), "Macet di jalan");
  assert.equal(sisipkanAlasan("Berangkat telat.", "Hujan deras"), "Berangkat telat, hujan deras");
  assert.equal(sisipkanAlasan("Macet di jalan", "macet di jalan"), "Macet di jalan");
});
