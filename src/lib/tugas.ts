import { supabase } from "./supabase";
import type { Profile } from "../types/database";

// Tugas umum dari admin (tabel tugas + tugas_progres, migrasi 0020).

export type SasaranTugas = "semua" | "divisi" | "personal";
export type StatusTugas = "belum" | "selesai" | "kendala";

export const LABEL_STATUS_TUGAS: Record<StatusTugas, string> = {
  belum: "Belum",
  selesai: "Selesai",
  kendala: "Kendala",
};

export interface Tugas {
  id: string;
  judul: string;
  deskripsi: string | null;
  aktif: boolean;
  sasaran: SasaranTugas;
  divisi_ids: string[];
  user_ids: string[];
  mulai_at: string | null;
  deadline_at: string | null;
  tampilkan_pembuat: boolean;
  dibuat_oleh: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgresTugas {
  tugas_id: string;
  user_id: string;
  status: StatusTugas;
  catatan: string | null;
  diperbarui_at: string;
}

export interface TugasDenganPembuat extends Tugas {
  pembuat: { nama: string } | null;
}

export type IsiTugas = Pick<
  Tugas,
  "judul" | "deskripsi" | "aktif" | "sasaran" | "divisi_ids" | "user_ids" | "mulai_at" | "deadline_at" | "tampilkan_pembuat"
>;

/** Pesan yang lebih jelas kalau migrasi 0020 belum dijalankan di Supabase. */
function galat(pesan: string): Error {
  if (/relation .*tugas.* does not exist|Could not find the table/i.test(pesan)) {
    return new Error("Fitur Tugas belum aktif di database. Admin perlu menjalankan migrasi 0020_tugas.sql di Supabase.");
  }
  return new Error(pesan);
}

/** Tugas aktif untuk pegawai yang login (RLS sudah menyaring sasaran), plus progresnya. */
export async function ambilTugasUmumSaya(userId: string): Promise<{ tugas: TugasDenganPembuat[]; progres: Record<string, ProgresTugas> }> {
  const [t, p] = await Promise.all([
    supabase.from("tugas").select("*, pembuat:dibuat_oleh(nama)").eq("aktif", true).or(`mulai_at.is.null,mulai_at.lte.${new Date().toISOString()}`).order("deadline_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("tugas_progres").select("*").eq("user_id", userId),
  ]);
  if (t.error) throw galat(t.error.message);
  if (p.error) throw galat(p.error.message);
  const progres: Record<string, ProgresTugas> = {};
  for (const r of (p.data as ProgresTugas[]) ?? []) progres[r.tugas_id] = r;
  return { tugas: (t.data as TugasDenganPembuat[]) ?? [], progres };
}

export async function simpanProgresTugas(tugasId: string, userId: string, status: StatusTugas, catatan: string | null): Promise<void> {
  const { error } = await supabase
    .from("tugas_progres")
    .upsert({ tugas_id: tugasId, user_id: userId, status, catatan, diperbarui_at: new Date().toISOString() }, { onConflict: "tugas_id,user_id" });
  if (error) throw galat(error.message);
}

/* ---------- Admin ---------- */

export async function ambilSemuaTugas(): Promise<{ tugas: TugasDenganPembuat[]; progres: ProgresTugas[] }> {
  const [t, p] = await Promise.all([
    supabase.from("tugas").select("*, pembuat:dibuat_oleh(nama)").order("created_at", { ascending: false }),
    supabase.from("tugas_progres").select("*"),
  ]);
  if (t.error) throw galat(t.error.message);
  if (p.error) throw galat(p.error.message);
  return { tugas: (t.data as TugasDenganPembuat[]) ?? [], progres: (p.data as ProgresTugas[]) ?? [] };
}

export async function simpanTugas(id: string | null, isi: IsiTugas): Promise<void> {
  const { error } = id ? await supabase.from("tugas").update(isi).eq("id", id) : await supabase.from("tugas").insert(isi);
  if (error) throw galat(error.message);
}

export async function ubahAktifTugas(id: string, aktif: boolean): Promise<void> {
  const { error } = await supabase.from("tugas").update({ aktif }).eq("id", id);
  if (error) throw galat(error.message);
}

export async function hapusTugas(id: string): Promise<void> {
  const { error } = await supabase.from("tugas").delete().eq("id", id);
  if (error) throw galat(error.message);
}

/** Pegawai aktif yang menjadi sasaran tugas (untuk menghitung progres di sisi admin). */
export function sasaranPegawai(t: Pick<Tugas, "sasaran" | "divisi_ids" | "user_ids">, pegawai: Profile[]): Profile[] {
  const aktif = pegawai.filter((p) => p.aktif);
  if (t.sasaran === "personal") return aktif.filter((p) => t.user_ids.includes(p.id));
  if (t.sasaran === "divisi") return aktif.filter((p) => p.divisi_id && t.divisi_ids.includes(p.divisi_id));
  return aktif;
}

/* ---------- Pengaturan menu Tugas Undangan ---------- */

/** Saklar menu Tugas Undangan. Kolom belum ada (migrasi belum dijalankan) = dianggap aktif. */
export async function ambilFiturTugasUndangan(): Promise<boolean> {
  const { data } = await supabase.from("pengaturan").select("*").eq("id", 1).maybeSingle();
  return (data as { fitur_tugas_undangan?: boolean } | null)?.fitur_tugas_undangan !== false;
}

export async function simpanFiturTugasUndangan(aktif: boolean): Promise<void> {
  const { error } = await supabase.from("pengaturan").update({ fitur_tugas_undangan: aktif }).eq("id", 1);
  if (error) {
    throw new Error(
      /fitur_tugas_undangan/.test(error.message)
        ? "Saklar ini belum aktif di database. Admin perlu menjalankan migrasi 0020_tugas.sql di Supabase."
        : error.message
    );
  }
}

/* ---------- Tampilan waktu ---------- */

export function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Keterangan deadline: "Lewat 2 hari", "Hari ini 16.00", "3 hari lagi". */
export function infoDeadline(iso: string, sekarang = new Date()): { teks: string; nada: "lewat" | "dekat" | "aman" } {
  const d = new Date(iso);
  const selisihMs = d.getTime() - sekarang.getTime();
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const hariIni = d.toDateString() === sekarang.toDateString();
  if (selisihMs < 0) {
    const hari = Math.floor(-selisihMs / 86_400_000);
    return { teks: hari >= 1 ? `Lewat ${hari} hari` : `Lewat (${jam})`, nada: "lewat" };
  }
  if (hariIni) return { teks: `Hari ini ${jam}`, nada: "dekat" };
  // Selisih hari kalender (bukan per 24 jam), supaya lusa tetap terbaca "2 hari lagi".
  const awalHari = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const hari = Math.round((awalHari(d) - awalHari(sekarang)) / 86_400_000);
  return { teks: hari <= 1 ? `Besok ${jam}` : `${hari} hari lagi`, nada: hari <= 2 ? "dekat" : "aman" };
}

/** ISO → nilai input datetime-local (waktu lokal perangkat). */
export function keInputWaktu(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
