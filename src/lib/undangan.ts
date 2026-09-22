import { supabase } from "./supabase";

export type KategoriUndangan = "vvip" | "vip_opd_mitra" | "wilayah_ormas" | "lansia_disabilitas_anak";
export type StatusUndangan = "belum" | "selesai" | "kendala";

export const LABEL_KATEGORI: Record<KategoriUndangan, string> = {
  vvip: "VVIP",
  vip_opd_mitra: "VIP OPD & Mitra",
  wilayah_ormas: "Wilayah & Ormas",
  lansia_disabilitas_anak: "Lansia/Disabilitas/Anak",
};

export const LABEL_STATUS_UNDANGAN: Record<StatusUndangan, string> = {
  belum: "Belum",
  selesai: "Selesai",
  kendala: "Kendala",
};

export interface Undangan {
  id: string;
  kategori: KategoriUndangan;
  sub_kelompok: string | null;
  nomor: number | null;
  nama: string;
  lokasi_parkir: string | null;
  lokasi_pengantaran: string | null;
  status: StatusUndangan;
  pic_user_id: string | null;
  catatan: string | null;
  diperbarui_oleh: string | null;
  diperbarui_at: string | null;
  created_at: string;
}

export interface UndanganDenganPic extends Undangan {
  pic?: { nama: string } | null;
}

export async function ambilSemuaUndangan(): Promise<UndanganDenganPic[]> {
  const { data, error } = await supabase
    .from("undangan")
    .select("*, pic:pic_user_id(nama)")
    .order("kategori")
    .order("nomor");
  if (error) throw new Error(error.message);
  return (data as UndanganDenganPic[]) ?? [];
}

export async function ambilTugasSaya(userId: string): Promise<Undangan[]> {
  const { data, error } = await supabase
    .from("undangan")
    .select("*")
    .eq("pic_user_id", userId)
    .order("kategori")
    .order("nomor");
  if (error) throw new Error(error.message);
  return (data as Undangan[]) ?? [];
}

export async function tugaskanUndangan(ids: string[], picUserId: string | null) {
  const { error } = await supabase.from("undangan").update({ pic_user_id: picUserId }).in("id", ids);
  if (error) throw new Error(error.message);
}

export async function perbaruiTugasUndangan(
  id: string,
  data: { status: StatusUndangan; catatan: string | null; lokasi_pengantaran: string | null }
) {
  const { error } = await supabase.from("undangan").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function perbaruiLokasiPengantaran(id: string, lokasiPengantaran: string | null) {
  const { error } = await supabase
    .from("undangan")
    .update({ lokasi_pengantaran: lokasiPengantaran })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface UndanganInput {
  kategori: KategoriUndangan;
  sub_kelompok: string | null;
  nama: string;
  lokasi_parkir: string | null;
}

export async function tambahUndangan(input: UndanganInput) {
  const { error } = await supabase.from("undangan").insert(input);
  if (error) throw new Error(error.message);
}

export async function perbaruiUndangan(id: string, input: UndanganInput) {
  const { error } = await supabase.from("undangan").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hapusUndangan(id: string) {
  const { error } = await supabase.from("undangan").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface RingkasanUndangan {
  total: number;
  selesai: number;
  kendala: number;
  belum: number;
}

export function hitungRingkasanUndangan(rows: { status: StatusUndangan }[]): RingkasanUndangan {
  let selesai = 0;
  let kendala = 0;
  for (const r of rows) {
    if (r.status === "selesai") selesai++;
    else if (r.status === "kendala") kendala++;
  }
  return { total: rows.length, selesai, kendala, belum: rows.length - selesai - kendala };
}
