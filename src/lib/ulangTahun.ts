import { supabase } from "./supabase";
import { tanggalHariIniWIB } from "./absensi";
import type { Profile, UcapanUlangTahun } from "../types/database";

/** "2026-05-14" -> "05-14" (bulan+tanggal saja, abaikan tahun). */
function bulanTanggal(tanggalIso: string): string {
  return tanggalIso.slice(5);
}

export function apakahUlangTahunHariIni(tanggalLahir: string | null | undefined): boolean {
  if (!tanggalLahir) return false;
  return bulanTanggal(tanggalLahir) === bulanTanggal(tanggalHariIniWIB());
}

/** Rekan sedivisi (bukan diri sendiri, aktif) yang hari ini ulang tahun. */
export async function ambilUlangTahunDivisi(divisiId: string, kecualiUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("divisi_id", divisiId)
    .eq("aktif", true)
    .not("tanggal_lahir", "is", null);
  if (error) throw new Error(error.message);

  const hariIni = bulanTanggal(tanggalHariIniWIB());
  return ((data as Profile[]) ?? []).filter(
    (p) => p.id !== kecualiUserId && p.tanggal_lahir && bulanTanggal(p.tanggal_lahir) === hariIni
  );
}

type UcapanDenganPengirim = UcapanUlangTahun & { profiles: { nama: string; foto_url: string | null } | null };

/** Ucapan yang masuk untuk seseorang, hari ini saja. */
export async function ambilUcapanUntuk(userId: string): Promise<UcapanDenganPengirim[]> {
  const { data, error } = await supabase
    .from("ucapan_ulang_tahun")
    .select("*, profiles:dari_user_id(nama, foto_url)")
    .eq("untuk_user_id", userId)
    .eq("tanggal", tanggalHariIniWIB())
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as UcapanDenganPengirim[]) ?? [];
}

export async function sudahMengucapkan(untukUserId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from("ucapan_ulang_tahun")
    .select("id")
    .eq("dari_user_id", auth.user.id)
    .eq("untuk_user_id", untukUserId)
    .eq("tanggal", tanggalHariIniWIB())
    .maybeSingle();
  return !!data;
}

export async function kirimUcapan(untukUserId: string, pesan: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Belum login.");

  const { error } = await supabase.from("ucapan_ulang_tahun").insert({
    dari_user_id: auth.user.id,
    untuk_user_id: untukUserId,
    tanggal: tanggalHariIniWIB(),
    pesan: pesan.trim(),
  });

  if (error) {
    if (error.code === "23505") throw new Error("Kamu sudah memberi ucapan untuk orang ini hari ini.");
    throw new Error(error.message);
  }
}
