import { supabase } from "./supabase";
import { kirimKlarifikasiAbsensi } from "./absensi";
import { tambahHari, type HariAbsenSaya } from "./izinAturan";

// Izin/Sakit beberapa hari sekaligus (migrasi 0043): tabel izin_pegawai + RPC
// simpan_izin / batal_izin. Tiap hari kerja di rentang tercatat izin di absensi.

export interface IzinPegawai {
  id: string;
  user_id: string;
  mulai: string;
  selesai: string;
  catatan: string;
  bukti_url: string | null;
  dibuat_at: string;
  diubah_at: string;
}

export const PESAN_IZIN_BELUM_AKTIF = "Izin beberapa hari belum aktif — admin perlu menjalankan migrasi 0043 di Supabase.";

const belumAda = (m: string) => /izin_pegawai|simpan_izin|batal_izin|izin_id|PGRST202|schema cache/i.test(m);

/**
 * Pengajuan izin saya yang masih relevan (berakhir paling lama 30 hari lalu) dan
 * hari-hari absen saya di sekitar hari ini (penanda di kalender & ringkasan).
 */
export async function ambilIzinSaya(
  userId: string,
  hariIni: string
): Promise<{ izin: IzinPegawai[]; hari: HariAbsenSaya[]; aktif: boolean }> {
  const [i, h] = await Promise.all([
    supabase.from("izin_pegawai").select("*").eq("user_id", userId).gte("selesai", tambahHari(hariIni, -30)).order("mulai", { ascending: false }),
    supabase
      .from("absensi")
      .select("*")
      .eq("user_id", userId)
      .gte("tanggal", tambahHari(hariIni, -60))
      .lte("tanggal", tambahHari(hariIni, 60)),
  ]);
  if (h.error) throw new Error(h.error.message);
  const hari = ((h.data ?? []) as HariAbsenSaya[]).map(({ tanggal, status, masuk_at, izin_id }) => ({ tanggal, status, masuk_at, izin_id: izin_id ?? null }));
  if (i.error) {
    if (belumAda(i.error.message)) return { izin: [], hari, aktif: false };
    throw new Error(i.error.message);
  }
  return { izin: (i.data as IzinPegawai[]) ?? [], hari, aktif: true };
}

/** Buat (id null) atau ubah pengajuan izin. Mengembalikan id pengajuan. */
export async function simpanIzin(p: {
  id: string | null;
  mulai: string;
  selesai: string;
  catatan: string;
  bukti: string;
  hariIni: string;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc("simpan_izin", {
    p_id: p.id,
    p_mulai: p.mulai,
    p_selesai: p.selesai,
    p_catatan: p.catatan,
    p_bukti_url: p.bukti || null,
  });
  if (!error) return data as string;
  if (!belumAda(error.message)) throw new Error(error.message);
  // Sebelum 0043: izin satu hari (hari ini / sebelumnya) tetap lewat cara lama.
  if (p.id === null && p.mulai === p.selesai && p.mulai <= p.hariIni) {
    await kirimKlarifikasiAbsensi(p.mulai, p.catatan, p.bukti);
    return null;
  }
  throw new Error(PESAN_IZIN_BELUM_AKTIF);
}

/** Batalkan pengajuan: hari izinnya dihapus (hari yang sudah dipakai absen tetap). */
export async function batalIzin(id: string): Promise<void> {
  const { error } = await supabase.rpc("batal_izin", { p_id: id });
  if (error) throw new Error(belumAda(error.message) ? PESAN_IZIN_BELUM_AKTIF : error.message);
}
