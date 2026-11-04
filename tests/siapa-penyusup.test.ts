// Jalankan: npm test   (node --test, tanpa dependensi tambahan — Node ≥ 23
// bisa langsung menjalankan TypeScript dengan menghapus anotasi tipenya)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DAFTAR_KATEGORI } from "../src/features/siapa-penyusup/kategori.ts";
import {
  aksiGabung,
  BATAS,
  bisaMulai,
  bolehKeluarkan,
  cekPemenang,
  cekPetunjuk,
  geser,
  hitungVote,
  hostBerikut,
  HURUF_KODE,
  jumlahPenyusupOtomatis,
  jumlahPenyusupValid,
  arahRoda,
  arahRodaTod,
  jenisJuring,
  JURING_RODA,
  juringDiJarum,
  kelasTimer,
  kodeValid,
  nomorWarnaDivisi,
  normalKata,
  poinPemain,
  penyusupDipakai,
  rapikanKode,
  putarRoda,
  sisaDetik,
  todTerkini,
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

test("normalisasi kata sama dengan game_normal()", () => {
  assert.equal(normalKata("  Alun-Alun   Kidul! "), "alun alun kidul");
  assert.equal(normalKata("Onde_onde"), "onde onde");
});

test("petunjuk: 1 kata, maks 24 huruf, bukan kata sendiri", () => {
  assert.equal(cekPetunjuk("   ", "Gudeg"), "kosong");
  assert.equal(cekPetunjuk("a".repeat(25), "Gudeg"), "panjang");
  assert.equal(cekPetunjuk("dua kata", "Gudeg"), "satu_kata");
  assert.equal(cekPetunjuk("  manis  ", "Gudeg"), null);
  assert.equal(cekPetunjuk("GUDEG!", "Gudeg"), "sama_kata");
  assert.equal(cekPetunjuk("CandiPrambanan", "Candi Prambanan"), "sama_kata");
  assert.equal(cekPetunjuk("Onde-onde", "Onde-onde"), "sama_kata");
  // P5: bagian kata diperbolehkan
  assert.equal(cekPetunjuk("Prambanan", "Candi Prambanan"), null);
});

test("timer: sisa detik dibulatkan ke atas, warna sesuai ambang", () => {
  const akhir = "2026-11-03T08:00:30.000Z";
  assert.equal(sisaDetik(akhir, Date.parse("2026-11-03T08:00:00.000Z")), 30);
  assert.equal(sisaDetik(akhir, Date.parse("2026-11-03T08:00:29.100Z")), 1);
  assert.equal(sisaDetik(akhir, Date.parse("2026-11-03T08:01:00.000Z")), 0);
  assert.equal(sisaDetik(null, 0), 0);
  assert.equal(kelasTimer(11), "");
  assert.equal(kelasTimer(10), "is-warning");
  assert.equal(kelasTimer(5), "is-critical sp-anim-critical");
});

test("hitung vote: suara terbanyak tersingkir", () => {
  const h = hitungVote([
    { voter: "a", target: "e" },
    { voter: "b", target: "e" },
    { voter: "c", target: "a" },
    { voter: "e", target: null },
  ]);
  assert.deepEqual(h.tally, { e: 2, a: 1 });
  assert.equal(h.lewati, 1);
  assert.equal(h.tersingkir, "e");
});

test("hitung vote: seri, lewati terbanyak, atau tanpa suara = tidak ada yang tersingkir", () => {
  const seri = [
    { voter: "a", target: "c" },
    { voter: "b", target: "d" },
  ];
  assert.equal(hitungVote(seri).tersingkir, null);
  const lewatiSama = [
    { voter: "a", target: "c" },
    { voter: "b", target: "c" },
    { voter: "c", target: null },
    { voter: "d", target: null },
  ];
  assert.equal(hitungVote(lewatiSama).tersingkir, null);
  assert.equal(hitungVote([]).tersingkir, null);
});

test("kondisi menang", () => {
  assert.equal(cekPemenang(0, 3), "pemandu");
  assert.equal(cekPemenang(1, 1), "penyusup");
  assert.equal(cekPemenang(2, 1), "penyusup");
  assert.equal(cekPemenang(1, 2), null);
  assert.equal(cekPemenang(2, 3), null);
});

test("skor sesuai tabel README (sama dengan skenario uji SQL)", () => {
  const dasar = { aktif: true, hidup: true, voteTepat: 0, rondeSelamat: 0, tebakanBenar: false };
  // pemandu menang, masih hidup, 1 vote tepat
  assert.equal(poinPemain({ ...dasar, peran: "pemandu", pemenang: "pemandu", voteTepat: 1 }), 180);
  assert.equal(poinPemain({ ...dasar, peran: "pemandu", pemenang: "pemandu", hidup: false }), 100);
  assert.equal(poinPemain({ ...dasar, peran: "pemandu", pemenang: "penyusup", voteTepat: 2 }), 60);
  // penyusup bertahan 6 ronde (batas ronde)
  assert.equal(poinPemain({ ...dasar, peran: "penyusup", pemenang: "penyusup", rondeSelamat: 6 }), 600);
  // penyusup tertangkap lalu tebakan terakhir benar
  assert.equal(poinPemain({ ...dasar, peran: "penyusup", pemenang: "penyusup", hidup: false, tebakanBenar: true }), 500);
  assert.equal(poinPemain({ ...dasar, peran: "penyusup", pemenang: "pemandu", hidup: false }), 0);
  // keluar sebelum selesai: 0
  assert.equal(poinPemain({ ...dasar, peran: "pemandu", pemenang: "pemandu", aktif: false, voteTepat: 3 }), 0);
});

// Bank kata ada di migrasi SQL; uji ini menjaga daftar kategori di klien tetap
// sama dengan database, dan memastikan pasangan kata layak dimainkan. Yang dibaca
// pernyataan insert-nya (diikuti baris baru), bukan contoh di komentar header.
const MIGRASI = new URL("../supabase/migrations/", import.meta.url);
const bankKata = readFileSync(new URL("0034_siapa_penyusup_bank_kata_umum.sql", MIGRASI), "utf8");
const blokKategori = bankKata.split("insert into penyusup_kategori (id, nama, ikon, urutan, aktif) values\n")[1].split("on conflict")[0];
const kategoriSql = [...blokKategori.matchAll(/\('([a-z_]+)', '([^']+)'/g)].map((m) => ({ id: m[1], nama: m[2] }));
const blokPasangan = bankKata.split("insert into penyusup_pasangan (kategori_id, kata_a, kata_b) values\n")[1].split("on conflict")[0];
const pasanganSql = [...blokPasangan.matchAll(/\('([a-z_]+)', '([^']+)', '([^']+)'\)/g)].map((m) => ({ kategori: m[1], a: m[2], b: m[3] }));
const terlarang = [
  ...readFileSync(new URL("0032_game_siapa_penyusup.sql", MIGRASI), "utf8")
    .split("insert into penyusup_kata_terlarang (kata) values\n")[1]
    .split("on conflict")[0]
    .matchAll(/\('([a-z]+)'\)/g),
].map((m) => m[1]);

test("kategori di klien sama dengan bank kata aktif di migrasi", () => {
  assert.deepEqual(
    DAFTAR_KATEGORI.map((k) => ({ id: k.id, nama: k.nama })),
    kategoriSql
  );
});

test("bank kata: tiap kategori cukup pasangan, kata dalam pasangan berbeda, tidak ada yang dobel", () => {
  assert.ok(pasanganSql.length >= 60);
  for (const k of kategoriSql) {
    const isi = pasanganSql.filter((p) => p.kategori === k.id);
    assert.ok(isi.length >= 8, `${k.id} hanya ${isi.length} pasangan`);
    const kata = isi.flatMap((p) => [normalKata(p.a), normalKata(p.b)]);
    assert.equal(new Set(kata).size, kata.length, `${k.id}: ada kata dobel`);
  }
  for (const p of pasanganSql) assert.notEqual(normalKata(p.a), normalKata(p.b), `${p.a} / ${p.b}`);
});

test("bank kata tidak memuat kata terlarang (petunjuk & chat yang wajar tidak akan tertolak)", () => {
  assert.ok(terlarang.includes("anjing"));
  for (const p of pasanganSql) {
    for (const kata of [p.a, p.b]) {
      for (const bagian of normalKata(kata).split(" ")) assert.ok(!terlarang.includes(bagian), `${kata} memuat kata terlarang`);
    }
  }
});

// ---------------------------------------------------------
// Truth or Dare (migrasi 0037)
// ---------------------------------------------------------

test("roda TRUTH/DARE selalu berhenti di jenis hasil server, putaran demi putaran", () => {
  assert.equal(JURING_RODA % 2, 0);
  let sudut = 0;
  for (let k = 0; k <= 200; k++) {
    const jenis = k % 3 === 0 ? "truth" : "dare";
    const berikut = putarRoda(sudut, arahRodaTod(jenis, k / 200));
    assert.ok(berikut >= sudut + 5 * 360, "selalu maju minimal 5 putaran penuh");
    assert.equal(jenisJuring(juringDiJarum(berikut)), jenis, `${jenis} k=${k}`);
    sudut = berikut;
  }
});

test("roda nama 2–11 pemain berhenti di korban dari server, tidak mepet batas juring", () => {
  for (let n = 2; n <= 11; n++) {
    let sudut = 0;
    for (let i = 0; i < n; i++) {
      for (const acak of [0, 0.37, 1]) {
        sudut = putarRoda(sudut, arahRoda(i, n, acak));
        assert.equal(juringDiJarum(sudut, n), i, `n=${n} i=${i} acak=${acak}`);
        const lebar = 360 / n;
        const posisi = ((((360 - (sudut % 360)) % 360) + 360) % 360) % lebar;
        assert.ok(posisi >= lebar * 0.19 && posisi <= lebar * 0.81, `n=${n} terlalu mepet batas: ${posisi}`);
      }
    }
  }
  assert.equal(putarRoda(725, 90, 0) % 360, 90, "tanpa putaran (kurangi gerakan) tetap di arah yang benar");
});

test("status Truth or Dare: putaran terbaru, lalu status paling maju, game ini saja", () => {
  const t = (game_ke: number, ke: number, status: string) => ({ game_ke, ke, status });
  assert.equal(todTerkini(2, null, undefined), null);
  assert.deepEqual(todTerkini(2, t(2, 1, "menunggu_ai"), t(2, 1, "siap")), t(2, 1, "siap"));
  assert.deepEqual(todTerkini(2, t(2, 1, "siap"), t(2, 1, "membuat")), t(2, 1, "siap"), "balasan lama tidak menimpa");
  assert.deepEqual(todTerkini(2, t(2, 1, "siap"), t(2, 2, "menunggu_ai")), t(2, 2, "menunggu_ai"), "Putar Lagi menang dari putaran lama yang sudah siap");
  assert.deepEqual(todTerkini(2, t(1, 5, "siap"), t(2, 1, "membuat")), t(2, 1, "membuat"), "data game sebelumnya diabaikan");
  assert.equal(todTerkini(3, t(2, 1, "siap")), null);
});

const todSql = readFileSync(new URL("0037_siapa_penyusup_truth_or_dare.sql", MIGRASI), "utf8");
const cadangan = (jenis: "truth" | "dare") => {
  const blok = todSql.split(jenis === "truth" ? "when p_jenis = 'truth' then array[\n" : "] else array[\n")[1].split("\n    ]")[0];
  return [...blok.matchAll(/^\s+'((?:[^']|'')+)'/gm)].map((m) => m[1]);
};

test("pilihan cadangan Truth or Dare cukup, singkat, dan bebas kata terlarang", () => {
  for (const jenis of ["truth", "dare"] as const) {
    const daftar = cadangan(jenis);
    assert.ok(daftar.length >= 6, `${jenis}: hanya ${daftar.length} pilihan`);
    assert.equal(new Set(daftar).size, daftar.length, `${jenis}: ada yang dobel`);
    for (const teks of daftar) {
      assert.ok(teks.length <= 140, `terlalu panjang: ${teks}`);
      for (const bagian of normalKata(teks).split(" ")) assert.ok(!terlarang.includes(bagian), `kata terlarang: ${teks}`);
    }
  }
  assert.ok(cadangan("truth").every((t) => t.includes("?")), "truth berupa pertanyaan");
});

test("fungsi Truth or Dare khusus server tidak bisa dipanggil klien", () => {
  for (const f of ["penyusup_tod_klaim(uuid)", "penyusup_tod_simpan(uuid, int, int, jsonb)"]) {
    assert.ok(todSql.includes(`revoke execute on function ${f} from public, anon, authenticated;`), f);
    assert.ok(todSql.includes(`grant execute on function ${f} to service_role;`), f);
  }
  for (const f of ["_penyusup_tod_baru(uuid, int, jsonb)", "_penyusup_tod_cadangan(text, jsonb)"]) {
    assert.ok(todSql.includes(`revoke execute on function ${f} from public, anon, authenticated;`), f);
  }
});
