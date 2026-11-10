// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { bacaIsiZip, daftarIsiZip } from "../src/lib/zipKecil.ts";

/** ZIP buatan sendiri: tiap file disimpan apa adanya (metode 0) atau deflate (metode 8). */
function buatZip(files: { nama: string; isi: string; deflate: boolean }[], komentar = ""): ArrayBuffer {
  const lokal: Buffer[] = [];
  const pusat: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const nama = Buffer.from(f.nama);
    const asli = Buffer.from(f.isi);
    const data = f.deflate ? deflateRawSync(asli) : asli;
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(f.deflate ? 8 : 0, 8);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(asli.length, 22);
    h.writeUInt16LE(nama.length, 26);
    lokal.push(h, nama, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(f.deflate ? 8 : 0, 10);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(asli.length, 24);
    c.writeUInt16LE(nama.length, 28);
    c.writeUInt32LE(offset, 42);
    pusat.push(c, nama);
    offset += 30 + nama.length + data.length;
  }
  const ukuranPusat = pusat.reduce((n, b) => n + b.length, 0);
  const kom = Buffer.from(komentar);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0);
  e.writeUInt16LE(files.length, 8);
  e.writeUInt16LE(files.length, 10);
  e.writeUInt32LE(ukuranPusat, 12);
  e.writeUInt32LE(offset, 16);
  e.writeUInt16LE(kom.length, 20);
  const semua = Buffer.concat([...lokal, ...pusat, e, kom]);
  return semua.buffer.slice(semua.byteOffset, semua.byteOffset + semua.length) as ArrayBuffer;
}

const teks = (b: Uint8Array) => new TextDecoder().decode(b);

test("pembaca zip: daftar isi & isi file (disimpan maupun deflate)", async () => {
  const xml = `<w:document>${"<w:p><w:r><w:t>Halo Jogja</w:t></w:r></w:p>".repeat(50)}</w:document>`;
  const buf = buatZip(
    [
      { nama: "[Content_Types].xml", isi: "<Types/>", deflate: false },
      { nama: "word/document.xml", isi: xml, deflate: true },
    ],
    "dibuat untuk uji"
  );
  const isi = daftarIsiZip(buf);
  assert.deepEqual([...isi.keys()], ["[Content_Types].xml", "word/document.xml"]);
  assert.equal(teks(await bacaIsiZip(buf, isi.get("[Content_Types].xml")!)), "<Types/>");
  assert.equal(teks(await bacaIsiZip(buf, isi.get("word/document.xml")!)), xml);
  assert.ok(isi.get("word/document.xml")!.ukuranTerkompres < xml.length, "benar-benar terkompres");
});

test("pembaca zip: file yang bukan zip ditolak dengan pesan jelas", () => {
  const bukan = new TextEncoder().encode("ini bukan docx, cuma teks biasa".repeat(3)).buffer;
  assert.throws(() => daftarIsiZip(bukan as ArrayBuffer), /Bukan file \.docx yang valid/);
});
