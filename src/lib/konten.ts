import { supabase } from "./supabase";
import type { Konten } from "../types/database";

export interface BarisKonten extends Konten {
  profiles?: { nama: string } | null;
  divisi?: { nama: string } | null;
}

export async function ambilKonten(opts?: { dari?: string; sampai?: string }): Promise<BarisKonten[]> {
  let query = supabase
    .from("konten")
    .select("*, profiles:pic_user_id(nama), divisi:divisi_id(nama)")
    .order("tanggal_tayang", { ascending: true });

  if (opts?.dari) query = query.gte("tanggal_tayang", opts.dari);
  if (opts?.sampai) query = query.lte("tanggal_tayang", opts.sampai);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as BarisKonten[]) ?? [];
}

export async function ambilKontenById(id: string): Promise<Konten | null> {
  const { data, error } = await supabase.from("konten").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Konten) ?? null;
}

export type SimpanKontenInput = Omit<
  Konten,
  "id" | "created_at" | "updated_at" | "dibuat_oleh"
>;

export async function buatKonten(input: SimpanKontenInput, dibuatOleh: string) {
  const { error } = await supabase.from("konten").insert({ ...input, dibuat_oleh: dibuatOleh });
  if (error) throw new Error(error.message);
}

export async function updateKonten(id: string, input: Partial<SimpanKontenInput>) {
  const { error } = await supabase.from("konten").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function ubahStatusKonten(id: string, status: Konten["status"]) {
  const { error } = await supabase.from("konten").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hapusKonten(id: string) {
  const { error } = await supabase.from("konten").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
