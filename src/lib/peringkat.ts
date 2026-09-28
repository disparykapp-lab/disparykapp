import { hitungRingkasan, type BarisAbsensi } from "./rekap";
import { formatTanggal, jumlahHariKerja, keYMD } from "./tanggal";
import type { Profile } from "../types/database";

export type PegawaiGrafik = Pick<Profile, "id" | "nama" | "foto_url">;

export interface EntriPeringkat {
  id: string;
  nama: string;
  foto_url: string | null;
  hadir: number;
  dinasLuar: number;
  telat: number;
  izin: number;
  tidakAbsen: number;
  skor: number;
}

/**
 * Peringkat kerajinan, terajin di urutan pertama. Poin: hadir tepat waktu &
 * dinas luar = 1, telat/izin = 1/2, tidak absen = 0, dibagi jumlah hari kerja.
 */
export function hitungPeringkat(
  rows: BarisAbsensi[],
  pegawai: PegawaiGrafik[],
  dari: Date,
  sampai: Date
): EntriPeringkat[] {
  const hariKerja = jumlahHariKerja(dari, sampai);
  const perUser = new Map<string, BarisAbsensi[]>();
  for (const r of rows) {
    const arr = perUser.get(r.user_id) ?? [];
    arr.push(r);
    perUser.set(r.user_id, arr);
  }
  return pegawai
    .map((p) => {
      const r = hitungRingkasan(perUser.get(p.id) ?? [], dari, sampai);
      const poin = r.hadir + r.dinasLuar + 0.5 * (r.telat + r.izin);
      const skor = hariKerja > 0 ? Math.min(100, Math.round((poin / hariKerja) * 100)) : 0;
      return {
        id: p.id,
        nama: p.nama,
        foto_url: p.foto_url,
        hadir: r.hadir,
        dinasLuar: r.dinasLuar,
        telat: r.telat,
        izin: r.izin,
        tidakAbsen: r.tidakAbsen,
        skor,
      };
    })
    .sort(
      (a, b) =>
        b.skor - a.skor ||
        a.tidakAbsen - b.tidakAbsen ||
        a.telat - b.telat ||
        a.nama.localeCompare(b.nama, "id")
    );
}

export function tingkatKerajinan(skor: number) {
  if (skor >= 95) return { label: "Sangat Rajin", emoji: "🌟", cls: "bg-green-100 text-green-800" };
  if (skor >= 85) return { label: "Rajin", emoji: "💪", cls: "bg-green-50 text-green-700" };
  if (skor >= 70) return { label: "Cukup", emoji: "🙂", cls: "bg-gray-100 text-gray-600" };
  if (skor >= 50) return { label: "Kurang Rajin", emoji: "😕", cls: "bg-amber-100 text-amber-800" };
  return { label: "Sangat Malas", emoji: "😴", cls: "bg-red-100 text-red-700" };
}

// ---------------------------------------------------------------------------
// Unduh gambar peringkat terajin (PNG) — digambar manual di kanvas supaya
// tidak butuh library tambahan.
// ---------------------------------------------------------------------------

const LEBAR = 1080;
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MEDALI = ["🥇", "🥈", "🥉"];

function muatGambar(src: string, crossOrigin = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function kotakBulat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function potongTeks(ctx: CanvasRenderingContext2D, teks: string, lebarMaks: number) {
  if (ctx.measureText(teks).width <= lebarMaks) return teks;
  let t = teks;
  while (t.length > 1 && ctx.measureText(t + "…").width > lebarMaks) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

export async function unduhGambarPeringkat(opts: {
  daftar: EntriPeringkat[];
  dari: Date;
  sampai: Date;
  jumlah?: number;
}) {
  const { daftar, dari, sampai, jumlah = 10 } = opts;
  const teratas = daftar.slice(0, jumlah);
  if (teratas.length === 0) throw new Error("Belum ada data untuk dijadikan gambar.");

  if (document.fonts?.ready) await document.fonts.ready;
  const [logo, ...foto] = await Promise.all([
    muatGambar("/logo-disparyk.png"),
    ...teratas.map((e) => (e.foto_url ? muatGambar(e.foto_url, true) : Promise.resolve(null))),
  ]);

  const tinggiBaris = (i: number) => (i < 3 ? 132 : 104);
  const JARAK = 16;
  const TINGGI_HEADER = 300;
  const TINGGI_FOOTER = 170;
  const isi = teratas.reduce((n, _, i) => n + tinggiBaris(i) + JARAK, 0);
  const tinggi = TINGGI_HEADER + 40 + isi + TINGGI_FOOTER;

  const canvas = document.createElement("canvas");
  canvas.width = LEBAR;
  canvas.height = tinggi;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pembuatan gambar.");

  // Latar
  ctx.fillStyle = "#f7f8fa";
  ctx.fillRect(0, 0, LEBAR, tinggi);

  // Header bergradasi (sama dengan header aplikasi)
  const grad = ctx.createLinearGradient(0, 0, LEBAR, TINGGI_HEADER);
  grad.addColorStop(0, "#8e1e3c");
  grad.addColorStop(1, "#b33951");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(LEBAR, 0);
  ctx.lineTo(LEBAR, TINGGI_HEADER - 48);
  ctx.arcTo(LEBAR, TINGGI_HEADER, LEBAR - 48, TINGGI_HEADER, 48);
  ctx.lineTo(48, TINGGI_HEADER);
  ctx.arcTo(0, TINGGI_HEADER, 0, TINGGI_HEADER - 48, 48);
  ctx.closePath();
  ctx.fill();

  let xTeks = 56;
  if (logo) {
    const t = 72;
    const l = (logo.width / logo.height) * t;
    ctx.drawImage(logo, 56, 44, l, t);
    xTeks = 56 + l + 16;
  }
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText("DisparYK", xTeks, 80);

  ctx.textBaseline = "alphabetic";
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText("🏆 Peringkat Terajin", 56, 194);
  ctx.font = `500 28px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(
    `${formatTanggal(dari, "d MMM yyyy")} – ${formatTanggal(sampai, "d MMM yyyy")}`,
    56,
    246
  );

  // Baris peringkat
  let y = TINGGI_HEADER + 40;
  teratas.forEach((e, i) => {
    const h = tinggiBaris(i);
    const besar = i < 3;

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#ffffff";
    kotakBulat(ctx, 40, y, LEBAR - 80, h, 28);
    ctx.fill();
    ctx.restore();

    if (besar) {
      ctx.strokeStyle = ["#f5c542", "#c0c6cf", "#d29a63"][i];
      ctx.lineWidth = 4;
      kotakBulat(ctx, 40, y, LEBAR - 80, h, 28);
      ctx.stroke();
    }

    const cy = y + h / 2;

    // Nomor / medali
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (besar) {
      ctx.font = `48px ${FONT}`;
      ctx.fillStyle = "#000";
      ctx.fillText(MEDALI[i], 100, cy + 2);
    } else {
      ctx.font = `700 34px ${FONT}`;
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(String(i + 1), 100, cy);
    }

    // Avatar
    const r = besar ? 44 : 34;
    const ax = 176;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const img = foto[i];
    if (img) {
      const s = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const w = img.width * s;
      const hh = img.height * s;
      ctx.drawImage(img, ax - w / 2, cy - hh / 2, w, hh);
    } else {
      ctx.fillStyle = "rgba(142, 30, 60, 0.12)";
      ctx.fillRect(ax - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = "#8e1e3c";
      ctx.font = `700 ${besar ? 40 : 30}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(e.nama.charAt(0).toUpperCase(), ax, cy + 2);
    }
    ctx.restore();

    // Nama + tingkat + bar skor
    const xNama = ax + r + 28;
    const xSkor = LEBAR - 80;
    const lebarTeks = xSkor - 150 - xNama;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#1f2937";
    ctx.font = `700 ${besar ? 36 : 30}px ${FONT}`;
    ctx.fillText(potongTeks(ctx, e.nama, lebarTeks), xNama, cy - (besar ? 8 : 6));

    const t = tingkatKerajinan(e.skor);
    ctx.fillStyle = "#6b7280";
    ctx.font = `500 ${besar ? 24 : 22}px ${FONT}`;
    ctx.fillText(`${t.emoji} ${t.label}`, xNama, cy + (besar ? 30 : 26));

    // Skor
    ctx.textAlign = "right";
    ctx.fillStyle = "#8e1e3c";
    ctx.font = `800 ${besar ? 52 : 42}px ${FONT}`;
    ctx.fillText(`${e.skor}%`, xSkor + 12, cy + (besar ? 16 : 14));

    y += h + JARAK;
  });

  // Footer
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(
    "Skor: hadir tepat waktu & dinas luar = 1, telat/izin = ½, tidak absen = 0",
    LEBAR / 2,
    y + 44
  );
  ctx.fillStyle = "#9ca3af";
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(
    `Dinas Pariwisata Kota Yogyakarta · dibuat ${formatTanggal(new Date(), "d MMM yyyy")}`,
    LEBAR / 2,
    y + 84
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Gagal membuat gambar.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `peringkat-terajin_${keYMD(dari)}_sd_${keYMD(sampai)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
