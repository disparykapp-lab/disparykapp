// Link pendaftaran admin (migrasi 0046). Aturan murni di undanganAdminAturan.ts.
import { supabase } from "./supabase";
import type { StatusUndangan } from "./undanganAdminAturan";
import type { UndanganAdmin } from "../types/database";

export const PESAN_UNDANGAN_BELUM_AKTIF =
  "Pendaftaran admin lewat link belum aktif di database. Admin perlu menjalankan migrasi 0046_undangan_admin.sql di Supabase.";

function galat(pesan: string): Error {
  if (/undangan_admin|daftar_admin/i.test(pesan) && /does not exist|Could not find|schema cache/i.test(pesan)) {
    return new Error(PESAN_UNDANGAN_BELUM_AKTIF);
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(pesan)) return new Error("Koneksi internet terputus. Coba lagi.");
  return new Error(pesan);
}

export type UndanganDenganNama = UndanganAdmin & {
  pembuat: { nama: string; role: string; aktif: boolean } | null;
  pemakai: { nama: string } | null;
};

/** Admin: link terbaru (berlaku & riwayatnya). */
export async function ambilUndanganAdmin(batas = 30): Promise<UndanganDenganNama[]> {
  const { data, error } = await supabase
    .from("undangan_admin")
    .select("*, pembuat:dibuat_oleh(nama, role, aktif), pemakai:dipakai_oleh(nama)")
    .order("dibuat_at", { ascending: false })
    .limit(batas);
  if (error) throw galat(error.message);
  return (data as UndanganDenganNama[]) ?? [];
}

export async function buatUndanganAdmin(catatan: string): Promise<UndanganAdmin> {
  const { data, error } = await supabase.rpc("buat_undangan_admin", { p_catatan: catatan.trim() });
  if (error) throw galat(error.message);
  return data as UndanganAdmin;
}

export async function batalUndanganAdmin(id: string): Promise<void> {
  const { error } = await supabase.rpc("batal_undangan_admin", { p_id: id });
  if (error) throw galat(error.message);
}

export interface InfoUndangan {
  status: StatusUndangan;
  pembuat?: string | null;
  berlaku_sampai?: string;
  /** pengguna yang sedang login adalah pemakai link ini */
  dipakai_saya?: boolean;
}

/** Status link untuk halaman /daftar-admin (boleh tanpa login). */
export async function cekUndanganAdmin(kode: string): Promise<InfoUndangan> {
  const { data, error } = await supabase.rpc("cek_undangan_admin", { p_kode: kode });
  if (error) throw galat(error.message);
  return data as InfoUndangan;
}

export async function daftarAdmin(kode: string, nama: string): Promise<void> {
  const { error } = await supabase.rpc("daftar_admin", { p_kode: kode, p_nama: nama.trim() });
  if (error) throw galat(error.message);
}
