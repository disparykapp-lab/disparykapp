// Menggambar hasil Naskah AI jadi kartu PNG berwatermark (1080 px, pas untuk WA/IG).
// Isi & pemotongan baris: kartuNaskah.ts. Watermark = logo DisparYK samar di latar
// + label di kaki kartu (tanpa nama pembuat).
import type { NaskahAi } from "../types/database";
import { bungkusTeks, isiKartuNaskah, MEREK_KARTU, ukuranHurufIsi } from "./kartuNaskah";

const LEBAR = 1080;
const TINGGI_MIN = 1080;
const LUAR = 40; // bingkai maroon
const PAD = 64; // dalam kartu putih
const X = LUAR + PAD;
const LEBAR_ISI = LEBAR - 2 * X;

const HURUF = `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
const WARNA = {
  maroon: "#8e1e3c",
  teks: "#1f2937",
  abu: "#6b7280",
  garis: "#ececec",
  chip: "#fbf3f5",
  nomor: "#ffffff",
};
const RASIO_LOGO = 100 / 139; // lebar / tinggi logo-disparyk.png

function muatGambar(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function jalurBulat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type Perintah = (ctx: CanvasRenderingContext2D) => void;

export async function buatGambarNaskah(hasil: NaskahAi): Promise<Blob> {
  const isi = isiKartuNaskah(hasil);
  const logo = await muatGambar("/logo-disparyk.png");

  const ukurCanvas = document.createElement("canvas").getContext("2d");
  if (!ukurCanvas) throw new Error("Browser tidak mendukung pembuatan gambar.");
  const ukurDengan = (font: string) => {
    ukurCanvas.font = font;
    return (s: string) => ukurCanvas.measureText(s).width;
  };

  // ---------- Susun (hitung posisi dulu, gambar belakangan) ----------
  const isiKartu: Perintah[] = [];
  const kaki: Perintah[] = [];
  let y = LUAR + PAD;

  // kepala: logo + nama instansi, chip gaya di kanan
  const tinggiLogo = 84;
  const lebarLogo = Math.round(tinggiLogo * RASIO_LOGO);
  const yKepala = y;
  const fontChip = `700 24px ${HURUF}`;
  const lebarChip = ukurDengan(fontChip)(isi.label) + 48;
  isiKartu.push((ctx) => {
    if (logo) ctx.drawImage(logo, X, yKepala, lebarLogo, tinggiLogo);
    const xNama = X + (logo ? lebarLogo + 20 : 0);
    ctx.fillStyle = WARNA.teks;
    ctx.font = `800 34px ${HURUF}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("DisparYK", xNama, yKepala + 36);
    ctx.fillStyle = WARNA.abu;
    ctx.font = `500 24px ${HURUF}`;
    ctx.fillText("Dinas Pariwisata Kota Yogyakarta", xNama, yKepala + 74);
    const xChip = X + LEBAR_ISI - lebarChip;
    ctx.fillStyle = WARNA.chip;
    jalurBulat(ctx, xChip, yKepala + 16, lebarChip, 52, 26);
    ctx.fill();
    ctx.fillStyle = WARNA.maroon;
    ctx.font = fontChip;
    ctx.textBaseline = "middle";
    ctx.fillText(isi.label, xChip + 24, yKepala + 43);
  });
  y += tinggiLogo + 48;

  // judul & keterangan acara
  if (isi.judul) {
    const font = `800 48px ${HURUF}`;
    const baris = bungkusTeks(isi.judul, LEBAR_ISI, ukurDengan(font));
    const y0 = y;
    isiKartu.push((ctx) => {
      ctx.fillStyle = WARNA.teks;
      ctx.font = font;
      ctx.textBaseline = "middle";
      baris.forEach((b, i) => ctx.fillText(b, X, y0 + 30 + i * 60));
    });
    y += baris.length * 60 + 6;
  }
  if (isi.meta) {
    const font = `500 26px ${HURUF}`;
    const baris = bungkusTeks(isi.meta, LEBAR_ISI, ukurDengan(font));
    const y0 = y;
    isiKartu.push((ctx) => {
      ctx.fillStyle = WARNA.abu;
      ctx.font = font;
      ctx.textBaseline = "middle";
      baris.forEach((b, i) => ctx.fillText(b, X, y0 + 19 + i * 38));
    });
    y += baris.length * 38;
  }
  y += 36;
  const yGaris1 = y;
  y += 44;

  // isi naskah
  const f = ukuranHurufIsi(isi.blok);
  const lh = Math.round(f * 1.55);
  const fontIsi = `400 ${f}px ${HURUF}`;
  const ukurIsi = ukurDengan(fontIsi);
  for (const b of isi.blok) {
    if (b.jenis === "jeda") {
      y += Math.round(f * 0.75);
      continue;
    }
    if (b.jenis === "teks") {
      const baris = bungkusTeks(b.teks, LEBAR_ISI, ukurIsi);
      const y0 = y;
      isiKartu.push((ctx) => {
        ctx.fillStyle = WARNA.teks;
        ctx.font = fontIsi;
        ctx.textBaseline = "middle";
        baris.forEach((t, i) => ctx.fillText(t, X, y0 + lh / 2 + i * lh));
      });
      y += baris.length * lh;
      continue;
    }
    const d = Math.round(f * 1.3);
    const indent = d + 22;
    const baris = bungkusTeks(b.teks, LEBAR_ISI - indent, ukurIsi);
    const y0 = y;
    const no = b.no;
    isiKartu.push((ctx) => {
      ctx.fillStyle = WARNA.maroon;
      ctx.beginPath();
      ctx.arc(X + d / 2, y0 + lh / 2, d / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WARNA.nomor;
      ctx.font = `700 ${Math.round(f * 0.7)}px ${HURUF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(no), X + d / 2, y0 + lh / 2 + 1);
      ctx.textAlign = "left";
      ctx.fillStyle = WARNA.teks;
      ctx.font = fontIsi;
      baris.forEach((t, i) => ctx.fillText(t, X + indent, y0 + lh / 2 + i * lh));
    });
    y += baris.length * lh;
  }
  const yIsiAkhir = y;

  // kaki: label watermark (didorong ke bawah kalau kartunya pendek)
  const tinggiKaki = 56 + 40 + 56 + PAD + LUAR;
  const tinggi = Math.max(TINGGI_MIN, y + tinggiKaki);
  const yKaki = tinggi - tinggiKaki + 56;
  kaki.push((ctx) => {
    ctx.fillStyle = WARNA.garis;
    ctx.fillRect(X, yKaki, LEBAR_ISI, 2);
    const yBaris = yKaki + 40;
    const lebarLogoKecil = Math.round(56 * RASIO_LOGO);
    if (logo) ctx.drawImage(logo, X, yBaris, lebarLogoKecil, 56);
    ctx.fillStyle = WARNA.maroon;
    ctx.font = `700 26px ${HURUF}`;
    ctx.textBaseline = "middle";
    ctx.fillText(MEREK_KARTU, X + (logo ? lebarLogoKecil + 18 : 0), yBaris + 29);
  });

  // ---------- Gambar ----------
  const canvas = document.createElement("canvas");
  canvas.width = LEBAR;
  canvas.height = tinggi;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pembuatan gambar.");

  ctx.fillStyle = WARNA.maroon;
  ctx.fillRect(0, 0, LEBAR, tinggi);
  ctx.fillStyle = "#ffffff";
  jalurBulat(ctx, LUAR, LUAR, LEBAR - 2 * LUAR, tinggi - 2 * LUAR, 40);
  ctx.fill();

  // watermark logo samar di belakang isi; berulang tiap ±1100 px untuk naskah panjang
  if (logo) {
    const atas = yGaris1;
    const bawah = Math.max(yIsiAkhir, yKaki);
    const tinggiWm = Math.min(520, Math.max(260, bawah - atas - 40));
    const lebarWm = tinggiWm * RASIO_LOGO;
    const jumlah = Math.max(1, Math.round((bawah - atas) / 1100));
    ctx.save();
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < jumlah; i++) {
      const tengah = atas + ((i + 0.5) * (bawah - atas)) / jumlah;
      ctx.drawImage(logo, (LEBAR - lebarWm) / 2, tengah - tinggiWm / 2, lebarWm, tinggiWm);
    }
    ctx.restore();
  }

  ctx.fillStyle = WARNA.garis;
  ctx.fillRect(X, yGaris1, LEBAR_ISI, 2);
  for (const p of isiKartu) p(ctx);
  for (const p of kaki) p(ctx);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gambar gagal dibuat."))), "image/png")
  );
}
