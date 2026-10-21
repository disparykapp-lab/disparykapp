import { supabase } from "./supabase";
import type { NaskahAi } from "../types/database";

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

/** Panggil Edge Function naskah-ai (yang menyimpan API key OpenAI secara rahasia di server),
 * lalu simpan hasilnya sebagai riwayat/log di tabel naskah_ai. */
export async function buatNaskahAi(f: FormNaskahAi): Promise<NaskahAi> {
  const { data, error } = await supabase.functions.invoke("naskah-ai", {
    body: {
      jenisAcara: f.jenisAcara || undefined,
      namaAcara: f.namaAcara || undefined,
      lokasi: f.lokasi || undefined,
      tanggal: f.tanggal || undefined,
      narasumber: f.narasumber || undefined,
      poinPenting: f.poinPenting,
      gaya: f.gaya,
      panjang: f.panjang,
      platformTujuan: f.platformTujuan || undefined,
    },
  });

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

  const hasil = data as { hasil: string; model: string };

  const { data: baris, error: errorSimpan } = await supabase
    .from("naskah_ai")
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
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
    })
    .select("*")
    .single();

  if (errorSimpan) throw new Error("Naskah berhasil dibuat tapi gagal disimpan ke riwayat: " + errorSimpan.message);
  return baris as NaskahAi;
}

export async function ambilRiwayatNaskahAi(): Promise<(NaskahAi & { profiles: { nama: string } | null })[]> {
  const { data, error } = await supabase
    .from("naskah_ai")
    .select("*, profiles(nama)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as (NaskahAi & { profiles: { nama: string } | null })[]) ?? [];
}
