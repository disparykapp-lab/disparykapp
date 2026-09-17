import { supabase } from "./supabase";

export async function unggahFotoProfil(userId: string, file: Blob): Promise<string> {
  const path = `${userId}/foto-${Date.now()}.jpg`;

  const { error } = await supabase.storage.from("avatar").upload(path, file, {
    contentType: "image/jpeg",
  });
  if (error) throw new Error("Gagal mengunggah foto: " + error.message);

  const { data } = supabase.storage.from("avatar").getPublicUrl(path);
  return data.publicUrl;
}

export interface ProfilSayaInput {
  nama: string;
  foto_url: string | null;
  tanggal_lahir: string | null;
  asal_sekolah: string | null;
}

export async function simpanProfilSaya(userId: string, input: ProfilSayaInput) {
  const { error } = await supabase.from("profiles").update(input).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function simpanMasaMagang(
  userId: string,
  mulai: string | null,
  selesai: string | null
) {
  const { error } = await supabase
    .from("profiles")
    .update({ tanggal_mulai_magang: mulai, tanggal_selesai_magang: selesai })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export interface ProgressMagang {
  persen: number;
  hariBerjalan: number;
  hariTersisa: number;
  totalHari: number;
  selesai: boolean;
  teksSisa: string;
}

export function hitungProgressMagang(mulai: string, selesai: string): ProgressMagang {
  const msPerHari = 1000 * 60 * 60 * 24;
  const tglMulai = new Date(mulai + "T00:00:00");
  const tglSelesai = new Date(selesai + "T00:00:00");
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  const totalHari = Math.max(1, Math.round((tglSelesai.getTime() - tglMulai.getTime()) / msPerHari));
  const berjalanMentah = Math.round((hariIni.getTime() - tglMulai.getTime()) / msPerHari);
  const hariBerjalan = Math.min(totalHari, Math.max(0, berjalanMentah));
  const hariTersisa = Math.max(0, totalHari - hariBerjalan);
  const persen = Math.round((hariBerjalan / totalHari) * 100);

  const bulanTersisa = Math.floor(hariTersisa / 30);
  const sisaHariSetelahBulan = hariTersisa % 30;
  let teksSisa: string;
  if (hariTersisa <= 0) {
    teksSisa = "Masa magang sudah selesai";
  } else if (bulanTersisa > 0) {
    teksSisa = `${bulanTersisa} bulan ${sisaHariSetelahBulan} hari lagi`;
  } else {
    teksSisa = `${hariTersisa} hari lagi`;
  }

  return {
    persen: Math.min(100, Math.max(0, persen)),
    hariBerjalan,
    hariTersisa,
    totalHari,
    selesai: hariTersisa <= 0,
    teksSisa,
  };
}
