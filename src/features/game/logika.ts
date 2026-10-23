// Logika murni game Coret Tebak — tanpa import, supaya bisa diuji langsung
// dengan `node --test` (lihat tests/coret-tebak.test.ts). Aturan yang sama
// dijalankan di server (supabase/migrations/0028_game_coret_tebak.sql); yang di
// sini dipakai klien untuk tampilan dan untuk memutuskan kapan memicu server.

export type StatusRoom = "menunggu" | "memilih" | "menggambar" | "reveal" | "selesai";

/** Sama dengan game_normal() di SQL: "Kupu-kupu!" -> "kupu kupu". */
export function normalTebakan(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Benar kalau sama persis setelah dinormalkan, atau sama setelah spasinya dibuang. */
export function tebakanCocok(tebakan: string, kunci: string): boolean {
  const a = normalTebakan(tebakan);
  const b = normalTebakan(kunci);
  return a === b || a.replace(/ /g, "") === b.replace(/ /g, "");
}

export function jarakEdit(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let sebelum = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const kini = [i];
    for (let j = 1; j <= b.length; j++) {
      const biaya = a[i - 1] === b[j - 1] ? 0 : 1;
      kini.push(Math.min(kini[j - 1] + 1, sebelum[j] + 1, sebelum[j - 1] + biaya));
    }
    sebelum = kini;
  }
  return sebelum[b.length];
}

export type HasilTebakan = "benar" | "hampir" | "salah";

/** Cerminan penilaian di game_tebak(): hampir = beda 1 huruf (kata ≥ 4) atau 2 huruf (kata ≥ 8). */
export function nilaiTebakan(tebakan: string, kunci: string): HasilTebakan {
  if (tebakanCocok(tebakan, kunci)) return "benar";
  const a = normalTebakan(tebakan).replace(/ /g, "");
  const b = normalTebakan(kunci);
  const jarak = jarakEdit(a, b.replace(/ /g, ""));
  if ((b.length >= 4 && jarak === 1) || (b.length >= 8 && jarak === 2)) return "hampir";
  return "salah";
}

/** 100 + floor(300 × sisa / total), +50 untuk penebak benar pertama. */
export function poinPenebak(sisaDetik: number, totalDetik: number, pertama: boolean): number {
  const sisa = Math.max(0, Math.min(sisaDetik, totalDetik));
  return 100 + Math.floor((300 * sisa) / totalDetik) + (pertama ? 50 : 0);
}

/** +50 per penebak benar, +100 kalau semua penebak benar. */
export function poinPenggambar(jumlahBenar: number, jumlahPenebak: number): number {
  const semua = jumlahPenebak > 0 && jumlahBenar === jumlahPenebak;
  return 50 * jumlahBenar + (semua ? 100 : 0);
}

/** Peringkat dengan skor sama = peringkat sama (1, 1, 3, ...). Urut skor tertinggi dulu. */
export function peringkat<T extends { skor: number }>(daftar: T[]): (T & { posisi: number })[] {
  const urut = [...daftar].sort((a, b) => b.skor - a.skor);
  let posisi = 0;
  return urut.map((item, i) => {
    if (i === 0 || urut[i - 1].skor !== item.skor) posisi = i + 1;
    return { ...item, posisi };
  });
}

/** "Ronde 2 dari 3" dari urutan giliran (pemain × ronde) dan indeks giliran sekarang. */
export function infoRonde(panjangUrutan: number, jumlahRonde: number, giliranKe: number) {
  const perRonde = Math.max(1, Math.round(panjangUrutan / Math.max(1, jumlahRonde)));
  return { ronde: Math.min(jumlahRonde, Math.floor(giliranKe / perRonde) + 1), total: jumlahRonde };
}

export interface KondisiFase {
  tenggatLewat: boolean;
  penggambarAda: boolean;
  semuaBenar: boolean;
  masihAdaGiliran: boolean;
  pemainOnline: number;
}

/**
 * Cerminan tabel keputusan _game_maju() di server. Klien memakainya untuk tahu
 * apakah memanggil game_detak() sekarang akan memajukan fase (mis. tepat saat
 * tenggat habis), supaya pergantian layar tidak menunggu detak berikutnya.
 */
export function faseBerikut(status: StatusRoom, k: KondisiFase): StatusRoom {
  if (status === "menunggu" || status === "selesai") return status;
  if (k.pemainOnline < 2) return "selesai";
  const giliranBaru: StatusRoom = k.masihAdaGiliran ? "memilih" : "selesai";
  switch (status) {
    case "memilih":
      if (!k.penggambarAda) return giliranBaru;
      return k.tenggatLewat ? "menggambar" : "memilih";
    case "menggambar":
      return !k.penggambarAda || k.tenggatLewat || k.semuaBenar ? "reveal" : "menggambar";
    case "reveal":
      return k.tenggatLewat ? giliranBaru : "reveal";
  }
}

/** Petunjuk "_a__ __g__" -> daftar kotak; null = jeda antarkata. */
export function kotakPetunjuk(pola: string): (string | null)[] {
  return [...pola].map((c) => (c === " " ? null : c === "_" ? "" : c));
}

/**
 * Nama pendek untuk tempat sempit. Biasanya kata pertama, tapi kalau kata pertama
 * cuma awalan pendek (mis. "Ni Wayan …", "I Made …", "M. Rizky …") ambil dua kata,
 * supaya tidak tampil "Ni" saja.
 */
export function namaPendek(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "";
  if (kata.length > 1 && kata[0].replace(/\./g, "").length <= 3) return `${kata[0]} ${kata[1]}`;
  return kata[0];
}

export function jumlahHuruf(pola: string): number {
  return [...pola].filter((c) => c !== " ").length;
}
