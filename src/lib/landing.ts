import { supabase } from "./supabase";
import { BAWAAN } from "../landing/defaults";
import { SEMUA_KUNCI, TAMPIL_BAWAAN, type Isi, type KunciLanding } from "../landing/types";

export interface EntriLanding<K extends KunciLanding = KunciLanding> {
  kunci: K;
  isi: Isi[K];
  tampil: boolean;
}

export type LandingTergabung = { [K in KunciLanding]: EntriLanding<K> };

interface BarisLanding {
  kunci: string;
  isi: Record<string, unknown>;
  tampil: boolean;
}

/**
 * Ambil semua bagian landing dan gabungkan dengan isi bawaan. Kalau tabel belum
 * ada/gagal dibaca, pakai bawaan saja supaya landing tetap tampil.
 */
export async function ambilLanding(): Promise<LandingTergabung> {
  const hasil = bawaanTergabung();

  const { data, error } = await supabase.from("landing_konten").select("kunci, isi, tampil");
  if (error || !data) return hasil;

  for (const baris of data as BarisLanding[]) {
    if (!SEMUA_KUNCI.includes(baris.kunci as KunciLanding)) continue;
    const k = baris.kunci as KunciLanding;
    // Gabung dengan bawaan agar field yang belum ada di JSON tetap punya nilai.
    setEntri(hasil, k, {
      kunci: k,
      isi: { ...BAWAAN[k], ...baris.isi } as Isi[typeof k],
      tampil: baris.tampil,
    });
  }
  return hasil;
}

function setEntri<K extends KunciLanding>(target: LandingTergabung, k: K, entri: EntriLanding<K>) {
  (target as Record<KunciLanding, EntriLanding<KunciLanding>>)[k] = entri as EntriLanding<KunciLanding>;
}

/** Simpan satu bagian (hanya admin yang lolos RLS). */
export async function simpanLanding<K extends KunciLanding>(
  kunci: K,
  isi: Isi[K],
  tampil: boolean,
  oleh: string
): Promise<void> {
  const { error } = await supabase.from("landing_konten").upsert(
    {
      kunci,
      isi,
      tampil,
      diperbarui_at: new Date().toISOString(),
      diperbarui_oleh: oleh,
    },
    { onConflict: "kunci" }
  );
  if (error) throw new Error(error.message);
}

/**
 * Kecilkan foto ke maksimal 1600px sisi terpanjang (WebP) lalu unggah ke bucket
 * `landing`. Mengembalikan URL publik.
 */
export async function unggahFotoLanding(file: File, kunci: string): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const skala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * skala);
  canvas.height = Math.round(bitmap.height * skala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar."))), "image/webp", 0.82)
  );

  const path = `${kunci}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage.from("landing").upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("landing").getPublicUrl(path).data.publicUrl;
}

/** Isi bawaan dalam bentuk tergabung, dipakai sebagai nilai awal sebelum data datang. */
export function bawaanTergabung(): LandingTergabung {
  const hasil = {} as LandingTergabung;
  for (const k of SEMUA_KUNCI) {
    setEntri(hasil, k, { kunci: k, isi: BAWAAN[k], tampil: TAMPIL_BAWAAN[k] });
  }
  return hasil;
}
