import { supabase } from "../../lib/supabase";
import type { StatusRoom } from "./logika";

export interface GameRoom {
  id: string;
  kode: string;
  host_id: string;
  tema: string;
  waktu_gambar: number;
  jumlah_ronde: number;
  maks_pemain: number;
  publik: boolean;
  status: StatusRoom;
  urutan: string[];
  giliran_ke: number;
  penggambar_id: string | null;
  petunjuk: string | null;
  kata_terungkap: string | null;
  fase_mulai: string | null;
  fase_berakhir: string | null;
  dibuat_at: string;
  diperbarui_at: string;
}

export interface ProfilRingkas {
  nama: string;
  foto_url: string | null;
}

export interface GamePemain {
  room_id: string;
  user_id: string;
  skor: number;
  sudah_benar: boolean;
  poin_giliran: number;
  aktif: boolean;
  bergabung_at: string;
  profiles: ProfilRingkas | null;
}

export interface GameTebakan {
  id: number;
  room_id: string;
  giliran_ke: number;
  user_id: string;
  teks: string;
  hasil: "salah" | "hampir" | "benar";
  dibuat_at: string;
}

export interface GameLog {
  id: number;
  room_id: string;
  jenis: "gabung" | "keluar" | "mulai" | "giliran" | "benar" | "reveal" | "selesai" | string;
  user_id: string | null;
  data: Record<string, unknown> | null;
  dibuat_at: string;
}

export type HasilKirimTebakan = "benar" | "hampir" | "salah" | "sudah" | "tutup" | "penggambar" | "kosong";

function cekError(error: { message: string } | null) {
  if (!error) return;
  if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
    throw new Error("Gagal terhubung ke server. Periksa koneksi internetmu.");
  }
  throw new Error(error.message);
}

export async function buatRoom(p: { tema: string; waktu: number; ronde: number; maks: number; publik: boolean }) {
  const { data, error } = await supabase.rpc("game_buat_room", {
    p_tema: p.tema,
    p_waktu: p.waktu,
    p_ronde: p.ronde,
    p_maks: p.maks,
    p_publik: p.publik,
  });
  cekError(error);
  return data as string;
}

export async function gabungRoom(kode: string) {
  const { data, error } = await supabase.rpc("game_gabung", { p_kode: kode });
  cekError(error);
  return data as string;
}

export async function keluarRoom(roomId: string) {
  const { error } = await supabase.rpc("game_keluar", { p_room: roomId });
  cekError(error);
}

export async function mulaiGame(roomId: string) {
  const { error } = await supabase.rpc("game_mulai", { p_room: roomId });
  cekError(error);
}

export async function pilihKata(roomId: string, indeks: number) {
  const { error } = await supabase.rpc("game_pilih_kata", { p_room: roomId, p_indeks: indeks });
  cekError(error);
}

export async function kirimTebakan(roomId: string, teks: string) {
  const { data, error } = await supabase.rpc("game_tebak", { p_room: roomId, p_teks: teks });
  cekError(error);
  return data as { hasil: HasilKirimTebakan; poin?: number };
}

/** Detak kehadiran + pemicu kemajuan fase. Mengembalikan jam server (ms). */
export async function detak(roomId: string): Promise<number> {
  const { data, error } = await supabase.rpc("game_detak", { p_room: roomId });
  cekError(error);
  return new Date((data as { sekarang: string }).sekarang).getTime();
}

export async function mainLagi(roomId: string) {
  const { error } = await supabase.rpc("game_main_lagi", { p_room: roomId });
  cekError(error);
}

export interface RoomLobi {
  id: string;
  kode: string;
  tema: string;
  waktu_gambar: number;
  jumlah_ronde: number;
  maks_pemain: number;
  host_nama: string | null;
  pemain: { user_id: string; nama: string; foto_url: string | null }[];
}

/** Room publik yang menunggu & masih punya penghuni online — disaring di server. */
export async function ambilRoomLobi(): Promise<RoomLobi[]> {
  const { data, error } = await supabase.rpc("game_daftar_lobi");
  cekError(error);
  return (data as RoomLobi[]) ?? [];
}

export async function ambilRoom(roomId: string) {
  const { data, error } = await supabase.from("game_room").select("*").eq("id", roomId).maybeSingle();
  cekError(error);
  return data as GameRoom | null;
}

export async function ambilPemain(roomId: string) {
  const { data, error } = await supabase
    .from("game_pemain")
    .select("*, profiles(nama, foto_url)")
    .eq("room_id", roomId)
    .order("bergabung_at");
  cekError(error);
  return (data as GamePemain[]) ?? [];
}

export async function ambilTebakan(roomId: string, giliranKe: number) {
  const { data, error } = await supabase
    .from("game_tebakan")
    .select("*")
    .eq("room_id", roomId)
    .eq("giliran_ke", giliranKe)
    .order("id");
  cekError(error);
  return (data as GameTebakan[]) ?? [];
}

export async function ambilLog(roomId: string) {
  const { data, error } = await supabase
    .from("game_log")
    .select("*")
    .eq("room_id", roomId)
    .order("id", { ascending: false })
    .limit(60);
  cekError(error);
  return ((data as GameLog[]) ?? []).reverse();
}

export async function ambilKehadiran(roomId: string) {
  const { data, error } = await supabase.from("game_kehadiran").select("user_id, terakhir_aktif").eq("room_id", roomId);
  cekError(error);
  return (data as { user_id: string; terakhir_aktif: string }[]) ?? [];
}

/** Hanya berhasil untuk penggambar yang sedang giliran (dibatasi RLS). */
export async function ambilRahasia(roomId: string) {
  const { data } = await supabase.from("game_rahasia").select("pilihan, kata").eq("room_id", roomId).maybeSingle();
  return (data as { pilihan: string[]; kata: string | null } | null) ?? null;
}
