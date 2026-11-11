// Olahan teks Naskah AI yang murni (tanpa dependensi) — diuji di tests/naskahAi.test.ts.

/** Jumlah kata (untuk info "±180 kata" di hasil). */
export function hitungKata(teks: string): number {
  const t = teks.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Jumlah poin di kotak cerita: baris yang berisi (bullet atau bukan). */
export function hitungPoin(teks: string): number {
  return teks.split("\n").filter((b) => b.replace(/^\s*[-•*]\s*/, "").trim().length > 0).length;
}

/**
 * Tambahkan poin baru "- {awalan}" di baris baru (chip cepat di bawah kotak cerita).
 * Baris kosong terakhir dipakai ulang supaya tidak menumpuk baris kosong.
 */
export function tambahPoin(teks: string, awalan: string): string {
  const poin = `- ${awalan}`;
  if (!teks.trim()) return poin;
  const rapi = teks.replace(/\s+$/, "");
  return `${rapi}\n${poin}`;
}

export interface PertanyaanTerpecah {
  /** teks sebelum nomor 1 (mis. "Berikut 5 pertanyaan…") */
  pembuka: string;
  daftar: string[];
  /** catatan setelah daftar (dipisah baris kosong) */
  penutup: string;
}

const bersih = (t: string) => t.replace(/\*\*/g, "").trim();

/**
 * Pecah hasil "pertanyaan wawancara" jadi daftar bernomor ("1. ...", "2) ...",
 * "**3.** ..."). Baris lanjutan ikut ke pertanyaan sebelumnya; teks setelah baris
 * kosong di akhir jadi penutup. Kurang dari 2 nomor → null (tampilkan apa adanya).
 */
export function pecahPertanyaan(teks: string): PertanyaanTerpecah | null {
  const pembuka: string[] = [];
  const daftar: string[] = [];
  let penutup: string[] = [];
  let jeda = false;
  for (const baris of teks.split("\n")) {
    const t = baris.trim();
    const m = t.match(/^(?:\*\*)?\d{1,2}[.)](?:\*\*)?\s+(.*)$/);
    if (m) {
      // teks di antara dua nomor ternyata lanjutan pertanyaan sebelumnya
      if (penutup.length) daftar[daftar.length - 1] += ` ${penutup.join(" ")}`;
      penutup = [];
      daftar.push(bersih(m[1]));
      jeda = false;
    } else if (!t) {
      if (daftar.length) jeda = true;
    } else if (!daftar.length) pembuka.push(t);
    else if (!jeda) daftar[daftar.length - 1] += ` ${bersih(t)}`;
    else penutup.push(bersih(t));
  }
  if (daftar.length < 2) return null;
  return { pembuka: pembuka.join("\n"), daftar, penutup: penutup.join("\n") };
}

/** Teks tampilan tanpa tanda tebal markdown ("**…**") yang kadang ditulis AI. */
export function tanpaMarkdown(teks: string): string {
  return teks.replace(/\*\*/g, "");
}

/** Judul kartu riwayat: nama acara, jenis acara, atau poin pertama cerita. */
export function judulRiwayat(r: { nama_acara: string | null; jenis_acara: string | null; poin_penting: string }): string {
  if (r.nama_acara?.trim()) return r.nama_acara.trim();
  if (r.jenis_acara?.trim()) return r.jenis_acara.trim();
  const poin = r.poin_penting
    .split("\n")
    .map((b) => b.replace(/^\s*[-•*]\s*/, "").trim())
    .find(Boolean);
  if (!poin) return "Tanpa judul";
  return poin.length > 48 ? `${poin.slice(0, 47).trimEnd()}…` : poin;
}
