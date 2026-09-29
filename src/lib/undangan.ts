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
  pic_tim_id: string | null;
  catatan: string | null;
  tanda_tangan_url: string | null;
  diperbarui_oleh: string | null;
  diperbarui_at: string | null;
  created_at: string;
}

export interface UndanganDenganPic extends Undangan {
  pic?: { nama: string } | null;
  pic_tim?: { nama: string } | null;
}

export async function ambilSemuaUndangan(): Promise<UndanganDenganPic[]> {
  const { data, error } = await supabase
    .from("undangan")
    .select("*, pic:pic_user_id(nama), pic_tim:pic_tim_id(nama)")
    .order("kategori")
    .order("nomor");
  if (error) throw new Error(error.message);
  return (data as UndanganDenganPic[]) ?? [];
}

/** Tugas milik pegawai: yang ditugaskan langsung ke dia ATAU lewat tim yang dia ikuti. */
export async function ambilTugasSaya(userId: string): Promise<UndanganDenganPic[]> {
  const { data: timSaya } = await supabase.from("tim_anggota").select("tim_id").eq("user_id", userId);
  const timIds = (timSaya ?? []).map((t) => t.tim_id as string);

  let query = supabase
    .from("undangan")
    .select("*, pic_tim:pic_tim_id(nama)")
    .order("kategori")
    .order("nomor");

  query =
    timIds.length > 0
      ? query.or(`pic_user_id.eq.${userId},pic_tim_id.in.(${timIds.join(",")})`)
      : query.eq("pic_user_id", userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as UndanganDenganPic[]) ?? [];
}

/**
 * Tugaskan ke 1 pegawai, ke 1 tim, atau batalkan penugasan (null) — cuma
 * salah satu dari pic_user_id/pic_tim_id yang boleh terisi (yang lain
 * otomatis dikosongkan, dijaga juga di trigger DB).
 */
export async function tugaskanUndangan(
  ids: string[],
  target: { userId: string } | { timId: string } | null
) {
  const payload =
    target && "userId" in target
      ? { pic_user_id: target.userId, pic_tim_id: null }
      : target && "timId" in target
        ? { pic_user_id: null, pic_tim_id: target.timId }
        : { pic_user_id: null, pic_tim_id: null };
  const { error } = await supabase.from("undangan").update(payload).in("id", ids);
  if (error) throw new Error(error.message);
}

export async function perbaruiTugasUndangan(
  id: string,
  data: {
    status: StatusUndangan;
    catatan: string | null;
    lokasi_pengantaran: string | null;
    tanda_tangan_url?: string;
  }
) {
  const { error } = await supabase.from("undangan").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Ambil URL sementara (5 menit) untuk menampilkan gambar tanda tangan privat. */
export async function ambilUrlTandaTangan(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("tanda_tangan").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

/**
 * Unggah gambar tanda tangan penerima (bukti penerimaan surat) ke storage.
 * Path pakai {userId}/{undanganId}.png dengan upsert supaya petugas bisa
 * menggambar ulang kalau salah, tanpa perlu kebijakan hapus terpisah.
 */
export async function unggahTandaTanganUndangan(
  undanganId: string,
  userId: string,
  blob: Blob
): Promise<string> {
  const path = `${userId}/${undanganId}.png`;
  const { error } = await supabase.storage.from("tanda_tangan").upload(path, blob, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error("Gagal menyimpan tanda tangan. Periksa koneksi internet kamu.");
  return path;
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
