import { supabase } from "./supabase";

export interface Tim {
  id: string;
  nama: string;
  created_at: string;
}

export interface AnggotaTim {
  id: string;
  nama: string;
}

export interface TimDenganAnggota extends Tim {
  anggota: AnggotaTim[];
}

interface BarisTimMentah {
  id: string;
  nama: string;
  created_at: string;
  tim_anggota: { profiles: AnggotaTim | null }[] | null;
}

export async function ambilSemuaTim(): Promise<TimDenganAnggota[]> {
  const { data, error } = await supabase
    .from("tim")
    .select("id, nama, created_at, tim_anggota(profiles(id, nama))")
    .order("nama");
  if (error) throw new Error(error.message);
  return ((data as unknown as BarisTimMentah[] | null) ?? []).map((t) => ({
    id: t.id,
    nama: t.nama,
    created_at: t.created_at,
    anggota: (t.tim_anggota ?? [])
      .map((ta) => ta.profiles)
      .filter((p): p is AnggotaTim => p !== null)
      .sort((a, b) => a.nama.localeCompare(b.nama, "id")),
  }));
}

/** Tim tempat seorang pegawai jadi anggota (dipakai buat ambil tugas timnya). */
export async function ambilTimSaya(userId: string): Promise<Tim[]> {
  const { data, error } = await supabase
    .from("tim_anggota")
    .select("tim(id, nama, created_at)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return ((data as unknown as { tim: Tim | null }[] | null) ?? [])
    .map((r) => r.tim)
    .filter((t): t is Tim => t !== null);
}

export async function buatTim(nama: string, anggotaIds: string[]): Promise<void> {
  const { data, error } = await supabase.from("tim").insert({ nama }).select("id").single();
  if (error) throw new Error(error.message);
  if (anggotaIds.length > 0) {
    const { error: errAnggota } = await supabase
      .from("tim_anggota")
      .insert(anggotaIds.map((user_id) => ({ tim_id: data.id as string, user_id })));
    if (errAnggota) throw new Error(errAnggota.message);
  }
}

export async function perbaruiTim(id: string, nama: string, anggotaIds: string[]): Promise<void> {
  const { error } = await supabase.from("tim").update({ nama }).eq("id", id);
  if (error) throw new Error(error.message);

  const { error: errHapus } = await supabase.from("tim_anggota").delete().eq("tim_id", id);
  if (errHapus) throw new Error(errHapus.message);

  if (anggotaIds.length > 0) {
    const { error: errTambah } = await supabase
      .from("tim_anggota")
      .insert(anggotaIds.map((user_id) => ({ tim_id: id, user_id })));
    if (errTambah) throw new Error(errTambah.message);
  }
}

export async function hapusTim(id: string): Promise<void> {
  const { error } = await supabase.from("tim").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
