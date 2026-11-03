import { supabase } from "../../lib/supabase";
import type { ModeRoom, PengaturanRoom, StatusRoom } from "./logika";

export interface PenyusupRoom {
  id: string;
  kode: string;
  host_id: string;
  mode: ModeRoom;
  divisi_id: string | null;
  privat: boolean;
  kategori_id: string | null;
  jumlah_penyusup: number;
  waktu_petunjuk: number;
  waktu_diskusi: number;
  waktu_voting: number;
  penyusup_tahu: boolean;
  tebakan_terakhir: boolean;
  status: StatusRoom;
  game_ke: number;
  ronde: number;
  urutan: string[];
  giliran_ke: number;
  giliran_user_id: string | null;
  fase_mulai: string | null;
  fase_berakhir: string | null;
  hasil_vote: Record<string, unknown> | null;
  akhir: Record<string, unknown> | null;
  dibuat_at: string;
  diperbarui_at: string;
}

export interface PenyusupPemain {
  room_id: string;
  user_id: string;
  divisi_id: string | null;
  avatar: number;
  siap: boolean;
  hafal: boolean;
  hidup: boolean;
  sudah_vote: boolean;
  aktif: boolean;
  dikeluarkan: boolean;
  skor: number;
  bergabung_at: string;
  profiles: { nama: string } | null;
}

export interface PenyusupLog {
  id: number;
  room_id: string;
  jenis: "gabung" | "keluar" | "dikeluarkan" | "host" | string;
  user_id: string | null;
  data: Record<string, unknown> | null;
  dibuat_at: string;
}

export interface DivisiRingkas {
  id: string;
  nama: string;
}

export interface RoomTerbuka {
  id: string;
  kode: string;
  mode: ModeRoom;
  privat: boolean;
  status: StatusRoom;
  divisi_nama: string | null;
  host_nama: string | null;
  jumlah_pemain: number;
  saya_anggota: boolean;
}

function cekError(error: { message: string } | null) {
  if (!error) return;
  if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
    throw new Error("Gagal terhubung ke server. Periksa koneksi internetmu.");
  }
  throw new Error(error.message);
}

export async function buatRoom(p: PengaturanRoom, avatar: number | null) {
  const { data, error } = await supabase.rpc("penyusup_buat_room", {
    p_mode: p.mode,
    p_kategori: p.kategori,
    p_jumlah_penyusup: p.jumlahPenyusup,
    p_waktu_petunjuk: p.waktuPetunjuk,
    p_waktu_diskusi: p.waktuDiskusi,
    p_waktu_voting: p.waktuVoting,
    p_penyusup_tahu: p.penyusupTahu,
    p_tebakan_terakhir: p.tebakanTerakhir,
    p_privat: p.privat,
    p_avatar: avatar,
  });
  cekError(error);
  return data as string;
}

/** Gabung lewat kode. Penolakan (kode salah, divisi beda, penuh, …) dilempar sebagai Error berisi pesan server. */
export async function gabungRoom(kode: string, avatar: number | null) {
  const { data, error } = await supabase.rpc("penyusup_gabung", { p_kode: kode, p_avatar: avatar });
  cekError(error);
  const hasil = data as { ok: boolean; room_id?: string; pesan?: string };
  if (!hasil.ok || !hasil.room_id) throw new Error(hasil.pesan ?? "Gagal bergabung.");
  return hasil.room_id;
}

export async function keluarRoom(roomId: string) {
  const { error } = await supabase.rpc("penyusup_keluar", { p_room: roomId });
  cekError(error);
}

export async function keluarkanPemain(roomId: string, userId: string) {
  const { error } = await supabase.rpc("penyusup_keluarkan", { p_room: roomId, p_user: userId });
  cekError(error);
}

export async function aturSiap(roomId: string, siap: boolean) {
  const { error } = await supabase.rpc("penyusup_siap", { p_room: roomId, p_siap: siap });
  cekError(error);
}

export async function pilihAvatar(roomId: string, avatar: number) {
  const { error } = await supabase.rpc("penyusup_pilih_avatar", { p_room: roomId, p_avatar: avatar });
  cekError(error);
}

/** Detak kehadiran + pemicu kemajuan state. Mengembalikan jam server (ms). */
export async function detak(roomId: string): Promise<number> {
  const { data, error } = await supabase.rpc("penyusup_detak", { p_room: roomId });
  cekError(error);
  return new Date((data as { sekarang: string }).sekarang).getTime();
}

/** Room yang sedang diikuti + room publik yang bisa dimasuki (disaring di server). */
export async function ambilDaftarRoom(): Promise<RoomTerbuka[]> {
  const { data, error } = await supabase.rpc("penyusup_daftar_room");
  cekError(error);
  return (data as RoomTerbuka[] | null) ?? [];
}

export async function ambilRoom(roomId: string) {
  const { data, error } = await supabase.from("penyusup_room").select("*").eq("id", roomId).maybeSingle();
  cekError(error);
  return data as PenyusupRoom | null;
}

export async function ambilPemain(roomId: string) {
  const { data, error } = await supabase
    .from("penyusup_pemain")
    .select("*, profiles(nama)")
    .eq("room_id", roomId)
    .order("bergabung_at");
  cekError(error);
  return (data as PenyusupPemain[]) ?? [];
}

export async function ambilLog(roomId: string) {
  const { data, error } = await supabase
    .from("penyusup_log")
    .select("*")
    .eq("room_id", roomId)
    .order("id", { ascending: false })
    .limit(40);
  cekError(error);
  return ((data as PenyusupLog[]) ?? []).reverse();
}

export async function ambilKehadiran(roomId: string) {
  const { data, error } = await supabase.from("penyusup_kehadiran").select("user_id, terakhir_aktif").eq("room_id", roomId);
  cekError(error);
  return (data as { user_id: string; terakhir_aktif: string }[]) ?? [];
}

/** Semua divisi, urut seperti di database — urutan ini yang menentukan warna --divisi-N. */
export async function ambilDivisi() {
  const { data, error } = await supabase.from("divisi").select("id, nama").order("created_at").order("id");
  cekError(error);
  return (data as DivisiRingkas[]) ?? [];
}
