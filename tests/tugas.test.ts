// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAKS_LAMPIRAN,
  MAKS_UKURAN_FILE,
  TIPE_PER_EKSTENSI,
  cekFileLampiran,
  folderLampiranMateri,
  folderLampiranPegawai,
  jenisDariTipe,
  judulLink,
  namaFileAman,
  perluKompres,
  rapikanLink,
  tipeKonten,
} from "../src/lib/tugasLampiranMeta.ts";
import {
  LABEL_STATUS_TUGAS,
  PILIHAN_BAWAAN,
  belumDiambil,
  dahulukanSematan,
  gabungTanya,
  hitungLangkah,
  idLangkah,
  kolomPilihan,
  perluPerhatian,
  pilihanStatus,
  rapikanLangkah,
  sudahBeres,
  sudahDiarsip,
  urutkanTugas,
} from "../src/lib/tugasAturan.ts";

test("jenis file lampiran yang diterima & tipenya", () => {
  assert.equal(tipeKonten("Laporan.PDF"), "application/pdf");
  assert.equal(tipeKonten("rekap.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(tipeKonten("arsip.rar"), "application/vnd.rar");
  assert.equal(tipeKonten("foto.HEIC"), "image/heic");
  assert.equal(tipeKonten("jingle.mp3"), "audio/mpeg");
  assert.equal(tipeKonten("rekaman.m4a"), "audio/mp4");
  for (const nama of ["virus.exe", "halaman.html", "logo.svg", "skrip.js", "tanpa-ekstensi", ".mp3"]) {
    assert.equal(tipeKonten(nama), null, nama);
  }
});

test("pengelompokan lampiran & gambar mana yang dikompres", () => {
  assert.equal(jenisDariTipe("image/png"), "gambar");
  assert.equal(jenisDariTipe("audio/mpeg"), "audio");
  assert.equal(jenisDariTipe("application/zip"), "file");
  assert.ok(perluKompres("image/jpeg") && perluKompres("image/png") && perluKompres("image/heic"));
  assert.ok(!perluKompres("image/gif"), "GIF tidak digambar ulang supaya animasinya tetap");
  assert.ok(!perluKompres("audio/mpeg") && !perluKompres("application/pdf"));
});

test("cek file sebelum diunggah", () => {
  assert.equal(cekFileLampiran("tugas.docx", 2_000_000, 0), null);
  assert.match(cekFileLampiran("tugas.docx", 2_000_000, MAKS_LAMPIRAN)!, /Maksimal 8 lampiran/);
  assert.match(cekFileLampiran("aplikasi.exe", 1000, 0)!, /belum didukung/);
  assert.match(cekFileLampiran("video-lagu.wav", MAKS_UKURAN_FILE + 1, 0)!, /terlalu besar .*maksimal 20,0 MB/);
  assert.equal(cekFileLampiran("pas.mp3", MAKS_UKURAN_FILE, 0), null, "tepat 20 MB masih boleh");
});

test("nama file aman untuk path Storage", () => {
  assert.equal(namaFileAman("Laporan Akhir (final) v2.PDF"), "Laporan-Akhir-final-v2.pdf");
  assert.equal(namaFileAman("Lagu Daerah – Gundul² Pacul.mp3"), "Lagu-Daerah-Gundul2-Pacul.mp3");
  assert.equal(namaFileAman("../../rahasia.txt"), "rahasia.txt");
  assert.equal(namaFileAman("📷.jpg"), "lampiran.jpg");
  assert.ok(namaFileAman(`${"a".repeat(200)}.zip`).length <= 64);
  assert.match(namaFileAman("a/b\\c..d.pdf"), /^[A-Za-z0-9_-]+\.pdf$/);
});

test("link lampiran dirapikan & yang berbahaya ditolak", () => {
  assert.equal(rapikanLink("  drive.google.com/file/d/abc  "), "https://drive.google.com/file/d/abc");
  assert.equal(rapikanLink("http://contoh.id"), "http://contoh.id");
  assert.equal(rapikanLink("https://youtu.be/xyz?t=10"), "https://youtu.be/xyz?t=10");
  for (const buruk of ["", "halo", "javascript:alert(1)", "ftp://server.id/a", "data:text/html,hai", "https://exa mple.com"]) {
    assert.equal(rapikanLink(buruk), null, buruk);
  }
  assert.equal(judulLink("https://www.canva.com/design/ABC/edit"), "canva.com/design/ABC/edit");
  assert.equal(judulLink("https://drive.google.com/"), "drive.google.com");
});

test("aturan di migrasi 0039 sama dengan aplikasi", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0039_tugas_lampiran.sql", import.meta.url), "utf8");
  const bucket = sql.match(/values \('tugas_lampiran', 'tugas_lampiran', false, (\d+), array\[([\s\S]*?)\]\)/);
  assert.ok(bucket, "insert bucket ditemukan");
  assert.equal(Number(bucket[1]), MAKS_UKURAN_FILE);
  const diBucket = new Set([...bucket[2].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  assert.deepEqual([...new Set(Object.values(TIPE_PER_EKSTENSI))].sort(), [...diBucket].sort(), "tipe bucket = tipe yang dikirim aplikasi");
  assert.ok(sql.includes(`jsonb_array_length(new.lampiran) > ${MAKS_LAMPIRAN}`), "batas jumlah lampiran sama");
  assert.ok(!diBucket.has("image/svg+xml") && !diBucket.has("text/html"), "tidak menerima jenis yang bisa menjalankan skrip");
});

test("lampiran dari pemberi tugas (0040): folder & aturan sama dengan aplikasi", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0040_tugas_lampiran_admin.sql", import.meta.url), "utf8");
  assert.equal(folderLampiranMateri("t1"), "materi/t1");
  assert.equal(folderLampiranPegawai("u1", "t1"), "u1/t1");
  assert.ok(sql.includes("'materi/' || new.id::text || '/'"), "trigger materi memakai folder materi/{tugas_id}/");
  assert.ok(sql.includes("new.user_id::text || '/' || new.tugas_id::text || '/'"), "trigger pegawai tetap {user_id}/{tugas_id}/");
  assert.ok(sql.includes("(storage.foldername(name))[1] = 'materi' and is_admin()"), "hanya admin yang mengunggah materi");
  assert.ok(sql.includes(`jsonb_array_length(p_lampiran) > ${MAKS_LAMPIRAN}`), "batas jumlah lampiran sama");
});

// ---------------------------------------------------------
// Pilihan tugas (migrasi 0041)
// ---------------------------------------------------------

const JAM_MS = 3_600_000;
const SEKARANG = Date.parse("2026-11-10T03:00:00Z");
const iso = (jamLagi: number) => new Date(SEKARANG + jamLagi * JAM_MS).toISOString();

test("status pegawai: menunggu dicek dihitung sudah dikerjakan, revisi kembali ke Belum", () => {
  assert.ok(sudahBeres("selesai") && sudahBeres("diperiksa"));
  assert.ok(!sudahBeres("revisi") && !sudahBeres("kendala") && !sudahBeres(undefined));
  assert.equal(pilihanStatus("diperiksa"), "selesai");
  assert.equal(pilihanStatus("revisi"), "belum");
  assert.equal(pilihanStatus("kendala"), "kendala");
});

test("tugas sukarela yang belum diambil bukan tanggungan", () => {
  assert.ok(belumDiambil({ kuota: 3 }, false));
  assert.ok(!belumDiambil({ kuota: 3 }, true));
  assert.ok(!belumDiambil({ kuota: null }, false));
  assert.ok(!belumDiambil({}, false), "sebelum migrasi 0041 (kolom belum ada)");
});

test("pengingat Beranda: mendesak, atau deadline < 24 jam / lewat", () => {
  const dasar = { deadline_at: null as string | null };
  assert.equal(perluPerhatian({ ...dasar, mendesak: true }, "belum", true, SEKARANG), "mendesak");
  assert.equal(perluPerhatian({ deadline_at: iso(5) }, undefined, false, SEKARANG), "deadline");
  assert.equal(perluPerhatian({ deadline_at: iso(-30) }, "kendala", true, SEKARANG), "deadline", "sudah lewat & belum beres");
  assert.equal(perluPerhatian({ deadline_at: iso(30) }, "belum", true, SEKARANG), null, "masih > 24 jam");
  assert.equal(perluPerhatian({ deadline_at: iso(5), ingatkan: false }, "belum", true, SEKARANG), null, "pengingat dimatikan admin");
  assert.equal(perluPerhatian({ deadline_at: iso(5), mendesak: true }, "diperiksa", true, SEKARANG), null, "sudah dikirim");
  assert.equal(perluPerhatian({ deadline_at: iso(5), kuota: 2 }, undefined, false, SEKARANG), null, "sukarela belum diambil");
});

test("urutan daftar: mendesak dulu, lalu deadline terdekat, lalu terbaru", () => {
  const t = (id: string, o: { mendesak?: boolean; deadline_at?: string | null; created_at?: string }) => ({
    id,
    mendesak: o.mendesak,
    deadline_at: o.deadline_at ?? null,
    created_at: o.created_at ?? "2026-11-01T00:00:00Z",
  });
  const hasil = urutkanTugas([
    t("tanpa-deadline-lama", { created_at: "2026-10-01T00:00:00Z" }),
    t("deadline-jauh", { deadline_at: iso(48) }),
    t("mendesak", { mendesak: true, deadline_at: iso(100) }),
    t("deadline-dekat", { deadline_at: iso(2) }),
    t("tanpa-deadline-baru", { created_at: "2026-11-05T00:00:00Z" }),
  ]).map((x) => x.id);
  assert.deepEqual(hasil, ["mendesak", "deadline-dekat", "deadline-jauh", "tanpa-deadline-baru", "tanpa-deadline-lama"]);
});

test("arsip otomatis N hari setelah deadline", () => {
  assert.ok(sudahDiarsip({ deadline_at: iso(-8 * 24), arsip_hari: 7 }, SEKARANG));
  assert.ok(!sudahDiarsip({ deadline_at: iso(-6 * 24), arsip_hari: 7 }, SEKARANG));
  assert.ok(!sudahDiarsip({ deadline_at: iso(-100 * 24), arsip_hari: null }, SEKARANG));
  assert.ok(!sudahDiarsip({ deadline_at: null, arsip_hari: 1 }, SEKARANG));
});

test("langkah-langkah: id valid, isian dirapikan, hitungan hanya langkah yang masih ada", () => {
  for (let i = 0; i < 50; i++) assert.match(idLangkah(), /^[a-z0-9]{1,20}$/);
  assert.deepEqual(rapikanLangkah([{ id: "a", teks: "  Ambil   foto " }, { id: "b", teks: "   " }, { id: "c", teks: "x".repeat(400) }]), [
    { id: "a", teks: "Ambil foto" },
    { id: "c", teks: "x".repeat(300) },
  ]);
  assert.equal(rapikanLangkah(Array.from({ length: 40 }, (_, i) => ({ id: `l${i}`, teks: "langkah" }))).length, 30);
  assert.deepEqual(hitungLangkah([{ id: "a", teks: "1" }, { id: "b", teks: "2" }], ["a", "dihapus-admin"]), { selesai: 1, total: 2 });
  assert.deepEqual(hitungLangkah(undefined, undefined), { selesai: 0, total: 0 });
});

test("kolom pilihan: sebelum migrasi 0041 hanya yang berbeda dari bawaan yang dikirim", () => {
  assert.deepEqual(kolomPilihan({ ...PILIHAN_BAWAAN }, false), {}, "tugas biasa tetap bisa disimpan sebelum migrasi");
  assert.deepEqual(kolomPilihan({ ...PILIHAN_BAWAAN, mendesak: true, kuota: 5 }, false), { mendesak: true, kuota: 5 });
  assert.equal(Object.keys(kolomPilihan({ ...PILIHAN_BAWAAN }, true)).length, Object.keys(PILIHAN_BAWAAN).length, "setelah migrasi semua dikirim (bisa dimatikan lagi)");
});

test("aturan di migrasi 0041 sama dengan aplikasi", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0041_tugas_pilihan.sql", import.meta.url), "utf8");
  const status = sql.match(/check \(status in \(([^)]+)\)\)/)![1].match(/'([a-z]+)'/g)!.map((s) => s.slice(1, -1));
  assert.deepEqual(status.sort(), Object.keys(LABEL_STATUS_TUGAS).sort(), "status yang diterima database = status yang dikenal aplikasi");
  assert.ok(sql.includes("jsonb_array_length(new.langkah) > 30"), "maks. 30 langkah sama dengan rapikanLangkah");
  assert.ok(sql.includes("kuota between 1 and 500") && sql.includes("arsip_hari between 1 and 365"), "batas kuota & arsip sama dengan form admin");
  assert.ok(sql.includes("'^[a-z0-9]{1,20}$'"), "format id langkah sama dengan idLangkah()");
  assert.ok(sql.includes("add column if not exists disematkan_at timestamptz"), "kolom pin admin ada");
});

test("pin admin: tugas disematkan paling atas (sematan terbaru dulu), di atas yang mendesak", () => {
  const t = (id: string, o: { disematkan_at?: string | null; mendesak?: boolean; deadline_at?: string | null }) => ({
    id,
    disematkan_at: o.disematkan_at ?? null,
    mendesak: o.mendesak,
    deadline_at: o.deadline_at ?? null,
    created_at: "2026-11-01T00:00:00Z",
  });
  const daftar = [
    t("biasa", {}),
    t("mendesak", { mendesak: true, deadline_at: iso(1) }),
    t("pin-lama", { disematkan_at: "2026-11-02T00:00:00Z" }),
    t("pin-baru", { disematkan_at: "2026-11-09T00:00:00Z" }),
  ];
  assert.deepEqual(urutkanTugas(daftar).map((x) => x.id), ["pin-baru", "pin-lama", "mendesak", "biasa"]);
  // daftar admin: hanya sematan yang naik, urutan lain (terbaru dibuat) tidak diubah
  assert.deepEqual(dahulukanSematan(daftar).map((x) => x.id), ["pin-baru", "pin-lama", "biasa", "mendesak"]);
  assert.deepEqual(dahulukanSematan([t("a", {}), t("b", {})]).map((x) => x.id), ["a", "b"], "tanpa sematan: urutan tetap");
});

// Tanya-jawab langsung (websocket, migrasi 0042)
test("gabung tanya: pesan yang datang dua kali (insert + websocket) tidak dobel, urut waktu", () => {
  const m = (id: number, menit: number) => ({ id, dibuat_at: new Date(Date.UTC(2026, 10, 10, 4, menit)).toISOString(), isi: `p${id}` });
  const lama = [m(1, 0), m(2, 1)];
  const hasil = gabungTanya(lama, [m(3, 2), m(2, 1)]);
  assert.deepEqual(hasil.map((x) => x.id), [1, 2, 3]);
  // websocket bisa datang tidak berurutan
  assert.deepEqual(gabungTanya([m(5, 9)], [m(4, 8)]).map((x) => x.id), [4, 5]);
  // waktu sama → urut id
  assert.deepEqual(gabungTanya([m(7, 3)], [m(6, 3)]).map((x) => x.id), [6, 7]);
  // tidak ada yang baru → array yang sama (tidak memicu render ulang)
  assert.equal(gabungTanya(lama, []), lama);
});

test("migrasi 0042 memasukkan tugas_tanya ke publikasi realtime tanpa dobel", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0042_tugas_tanya_realtime.sql", import.meta.url), "utf8");
  assert.match(sql, /alter publication supabase_realtime add table public\.tugas_tanya/);
  assert.match(sql, /pg_publication_tables[\s\S]*tablename = 'tugas_tanya'/);
});
