// Pembaca ZIP minimal (cukup untuk .docx) — tanpa dependensi: daftar isi dari
// central directory, isi file dibuka dengan DecompressionStream("deflate-raw")
// bawaan browser (Chrome 103+, Safari 16.4+, Firefox 113+; juga Node 18+).

export interface EntriZip {
  nama: string;
  /** 0 = disimpan apa adanya, 8 = deflate */
  metode: number;
  ukuranTerkompres: number;
  offsetLokal: number;
}

/** Daftar file di dalam ZIP, dibaca dari End Of Central Directory di akhir file. */
export function daftarIsiZip(buf: ArrayBuffer): Map<string, EntriZip> {
  const v = new DataView(buf);
  // EOCD ada di 22 byte terakhir, ditambah komentar ZIP (maks. 65535 byte)
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 65535); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Bukan file .docx yang valid.");

  const jumlah = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const teks = new TextDecoder();
  const hasil = new Map<string, EntriZip>();
  for (let k = 0; k < jumlah; k++) {
    if (p + 46 > buf.byteLength || v.getUint32(p, true) !== 0x02014b50) throw new Error("Isi file .docx rusak.");
    const panjangNama = v.getUint16(p + 28, true);
    const panjangExtra = v.getUint16(p + 30, true);
    const panjangKomentar = v.getUint16(p + 32, true);
    const nama = teks.decode(new Uint8Array(buf, p + 46, panjangNama));
    hasil.set(nama, {
      nama,
      metode: v.getUint16(p + 10, true),
      ukuranTerkompres: v.getUint32(p + 20, true),
      offsetLokal: v.getUint32(p + 42, true),
    });
    p += 46 + panjangNama + panjangExtra + panjangKomentar;
  }
  return hasil;
}

/** Isi satu file di dalam ZIP (ukuran diambil dari central directory, jadi aman untuk data descriptor). */
export async function bacaIsiZip(buf: ArrayBuffer, e: EntriZip): Promise<Uint8Array> {
  const v = new DataView(buf);
  if (v.getUint32(e.offsetLokal, true) !== 0x04034b50) throw new Error("Isi file .docx rusak.");
  const awal = e.offsetLokal + 30 + v.getUint16(e.offsetLokal + 26, true) + v.getUint16(e.offsetLokal + 28, true);
  const data = new Uint8Array(buf, awal, e.ukuranTerkompres);
  if (e.metode === 0) return data.slice();
  if (e.metode !== 8) throw new Error("Format kompresi di file ini tidak didukung.");
  const aliran = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(aliran).arrayBuffer());
}
