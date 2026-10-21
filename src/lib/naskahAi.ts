import { supabase } from "./supabase";
import type { NaskahAi, TipeNaskahAi } from "../types/database";

export interface FormNaskahAi {
  jenisAcara: string;
  namaAcara: string;
  lokasi: string;
  tanggal: string;
  narasumber: string;
  poinPenting: string;
  gaya: string;
  panjang: string;
  platformTujuan: string;
}

export interface FormPertanyaanWawancara {
  jenisAcara: string;
  namaAcara: string;
  lokasi: string;
  tanggal: string;
  narasumber: string;
  poinPenting: string;
  gaya: string;
  jumlahPertanyaan: number;
}

async function panggilEdgeFunction(body: Record<string, unknown>): Promise<{ hasil: string; model: string }> {
  const { data, error } = await supabase.functions.invoke("naskah-ai", { body });

  if (error) {
    // Edge Function mengembalikan body JSON { error: "..." } untuk status 4xx/5xx,
    // tapi supabase-js cuma kasih FunctionsHttpError generik — coba ambil pesan aslinya.
    let pesan = error.message;
    try {
      const konteks = (error as { context?: Response }).context;
      if (konteks) {
        const isi = await konteks.clone().json();
        if (isi?.error) pesan = isi.error;
      }
    } catch {
      // abaikan, pakai pesan generik
    }
    throw new Error(pesan);
  }

  return data as { hasil: string; model: string };
}

async function simpanRiwayat(row: Record<string, unknown>): Promise<NaskahAi> {
  const { data: baris, error } = await supabase
    .from("naskah_ai")
    .insert({ user_id: (await supabase.auth.getUser()).data.user?.id, ...row })
    .select("*")
    .single();

  if (error) throw new Error("Berhasil dibuat tapi gagal disimpan ke riwayat: " + error.message);
  return baris as NaskahAi;
}

/** Panggil Edge Function naskah-ai (yang menyimpan API key OpenAI secara rahasia di server),
 * lalu simpan hasilnya sebagai riwayat/log di tabel naskah_ai. */
export async function buatNaskahAi(f: FormNaskahAi): Promise<NaskahAi> {
  const hasil = await panggilEdgeFunction({
    tipe: "naskah",
    jenisAcara: f.jenisAcara || undefined,
    namaAcara: f.namaAcara || undefined,
    lokasi: f.lokasi || undefined,
    tanggal: f.tanggal || undefined,
    narasumber: f.narasumber || undefined,
    poinPenting: f.poinPenting,
    gaya: f.gaya,
    panjang: f.panjang,
    platformTujuan: f.platformTujuan || undefined,
  });

  return simpanRiwayat({
    tipe: "naskah",
    jenis_acara: f.jenisAcara || null,
    nama_acara: f.namaAcara || null,
    lokasi: f.lokasi || null,
    tanggal: f.tanggal || null,
    narasumber: f.narasumber || null,
    poin_penting: f.poinPenting,
    gaya: f.gaya,
    panjang: f.panjang,
    platform_tujuan: f.platformTujuan || null,
    model: hasil.model,
    hasil: hasil.hasil,
  });
}

/** Sama seperti buatNaskahAi, tapi mode "pertanyaan" — daftar pertanyaan wawancara liputan. */
export async function buatPertanyaanWawancara(f: FormPertanyaanWawancara): Promise<NaskahAi> {
  const hasil = await panggilEdgeFunction({
    tipe: "pertanyaan",
    jenisAcara: f.jenisAcara || undefined,
    namaAcara: f.namaAcara || undefined,
    lokasi: f.lokasi || undefined,
    tanggal: f.tanggal || undefined,
    narasumber: f.narasumber || undefined,
    poinPenting: f.poinPenting,
    gaya: f.gaya,
    jumlahPertanyaan: f.jumlahPertanyaan,
  });

  return simpanRiwayat({
    tipe: "pertanyaan",
    jenis_acara: f.jenisAcara || null,
    nama_acara: f.namaAcara || null,
    lokasi: f.lokasi || null,
    tanggal: f.tanggal || null,
    narasumber: f.narasumber || null,
    poin_penting: f.poinPenting,
    gaya: f.gaya,
    jumlah_pertanyaan: f.jumlahPertanyaan,
    model: hasil.model,
    hasil: hasil.hasil,
  });
}

export async function ambilRiwayatNaskahAi(
  tipe: TipeNaskahAi
): Promise<(NaskahAi & { profiles: { nama: string } | null })[]> {
  const { data, error } = await supabase
    .from("naskah_ai")
    .select("*, profiles(nama)")
    .eq("tipe", tipe)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as (NaskahAi & { profiles: { nama: string } | null })[]) ?? [];
}

/** Hapus satu baris riwayat naskah AI siapa saja (naskah maupun pertanyaan) — khusus super admin. */
export async function superAdminHapusNaskahAi(id: string): Promise<void> {
  const { error } = await supabase.rpc("super_admin_hapus_naskah_ai", { p_id: id });
  if (error) throw new Error(error.message);
}
