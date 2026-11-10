import { supabase } from "./supabase";
import {
  MAKS_UKURAN_FILE,
  SISI_MAKS_GAMBAR,
  TARGET_UKURAN_GAMBAR,
  formatUkuran,
  jenisDariTipe,
  namaFileAman,
  perluKompres,
  tipeKonten,
  type Lampiran,
} from "./tugasLampiranMeta";
import type { PilihanTugas, StatusTugas } from "./tugasAturan";
import { kompresGambar, unggahDenganProgres } from "./unggah";
import type { Profile } from "../types/database";

// Tugas umum dari admin (tabel tugas + tugas_progres, migrasi 0020; pilihan 0041).

export { LABEL_STATUS_TUGAS, type StatusTugas } from "./tugasAturan";
export type SasaranTugas = "semua" | "divisi" | "personal";

export interface Tugas extends PilihanTugas {
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
  /** materi dari pemberi tugas (migrasi 0040); tidak ada kalau migrasinya belum dijalankan */
  lampiran?: Lampiran[];
  created_at: string;
  updated_at: string;
}

export interface ProgresTugas {
  tugas_id: string;
  user_id: string;
  status: StatusTugas;
  catatan: string | null;
  /** migrasi 0039; tidak ada kalau migrasinya belum dijalankan */
  lampiran?: Lampiran[];
  /** migrasi 0041: id langkah yang sudah dicentang, catatan & waktu pemeriksaan admin */
  langkah_selesai?: string[];
  catatan_admin?: string | null;
  diperiksa_at?: string | null;
  diperbarui_at: string;
}

export interface TanyaTugas {
  id: number;
  tugas_id: string;
  /** pemilik percakapan (pegawai yang bertanya) */
  user_id: string;
  pengirim_id: string | null;
  isi: string;
  dibuat_at: string;
}

export interface TugasDenganPembuat extends Tugas {
  pembuat: { nama: string } | null;
}

export type IsiTugas = Pick<
  Tugas,
  "judul" | "deskripsi" | "aktif" | "sasaran" | "divisi_ids" | "user_ids" | "mulai_at" | "deadline_at" | "tampilkan_pembuat" | "lampiran"
> &
  Partial<Omit<PilihanTugas, "kuota_terisi">>;

const BUCKET_LAMPIRAN = "tugas_lampiran";
const PESAN_LAMPIRAN_BELUM_AKTIF = "Lampiran tugas belum aktif di database. Admin perlu menjalankan migrasi 0039_tugas_lampiran.sql di Supabase.";
const PESAN_MATERI_BELUM_AKTIF = "Lampiran dari pemberi tugas belum aktif di database. Jalankan migrasi 0040_tugas_lampiran_admin.sql di Supabase.";

const PESAN_PILIHAN_BELUM_AKTIF = "Pilihan tugas ini belum aktif di database. Admin perlu menjalankan migrasi 0041_tugas_pilihan.sql di Supabase.";

/** Pesan yang lebih jelas kalau migrasi 0020/0039/0040/0041 belum dijalankan di Supabase. */
function galat(pesan: string): Error {
  if (/perlu_cek|mendesak|kuota|wajib_baca|langkah|arsip_hari|ingatkan|tanya_jawab|disematkan_at|tugas_dibaca|tugas_tanya|ambil_tugas|lepas_tugas|periksa_tugas/.test(pesan)) {
    return new Error(PESAN_PILIHAN_BELUM_AKTIF);
  }
  if (/lampiran/i.test(pesan) && /column|kolom/i.test(pesan)) {
    return new Error(/'tugas'/.test(pesan) ? PESAN_MATERI_BELUM_AKTIF : PESAN_LAMPIRAN_BELUM_AKTIF);
  }
  if (/relation .*tugas.* does not exist|Could not find the table/i.test(pesan)) {
    return new Error("Fitur Tugas belum aktif di database. Admin perlu menjalankan migrasi 0020_tugas.sql di Supabase.");
  }
  return new Error(pesan);
}

/**
 * Tugas aktif untuk pegawai yang login (RLS sudah menyaring sasaran & arsip), plus
 * progres & waktu "sudah dibaca" miliknya sendiri.
 */
export async function ambilTugasUmumSaya(
  userId: string
): Promise<{ tugas: TugasDenganPembuat[]; progres: Record<string, ProgresTugas>; dibaca: Record<string, string> }> {
  const [t, p, b] = await Promise.all([
    supabase.from("tugas").select("*, pembuat:dibuat_oleh(nama)").eq("aktif", true).or(`mulai_at.is.null,mulai_at.lte.${new Date().toISOString()}`).order("deadline_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("tugas_progres").select("*").eq("user_id", userId),
    supabase.from("tugas_dibaca").select("tugas_id, dibaca_at").eq("user_id", userId),
  ]);
  if (t.error) throw galat(t.error.message);
  if (p.error) throw galat(p.error.message);
  const progres: Record<string, ProgresTugas> = {};
  for (const r of (p.data as ProgresTugas[]) ?? []) progres[r.tugas_id] = r;
  // tabel tugas_dibaca baru ada setelah 0041 — sebelum itu dianggap belum ada yang dibaca
  const dibaca: Record<string, string> = {};
  for (const r of (b.error ? [] : (b.data as { tugas_id: string; dibaca_at: string }[])) ?? []) dibaca[r.tugas_id] = r.dibaca_at;
  return { tugas: (t.data as TugasDenganPembuat[]) ?? [], progres, dibaca };
}

/* ---------- Pilihan tugas (migrasi 0041) ---------- */

/** Ambil tugas sukarela (kuota) — siapa cepat dia dapat; server yang menjaga kuotanya. */
export async function ikutTugas(tugasId: string): Promise<void> {
  const { error } = await supabase.rpc("ambil_tugas", { p_tugas: tugasId });
  if (error) throw galat(error.message);
}

/** Batal mengambil tugas sukarela (hanya selama belum dikerjakan). */
export async function lepasTugas(tugasId: string): Promise<void> {
  const { error } = await supabase.rpc("lepas_tugas", { p_tugas: tugasId });
  if (error) throw galat(error.message);
}

export async function tandaiDibaca(tugasId: string, userId: string): Promise<string> {
  const dibaca_at = new Date().toISOString();
  const { error } = await supabase.from("tugas_dibaca").upsert({ tugas_id: tugasId, user_id: userId }, { onConflict: "tugas_id,user_id", ignoreDuplicates: true });
  if (error) throw galat(error.message);
  return dibaca_at;
}

/** Simpan centangan langkah langsung (tanpa menunggu tombol Simpan). */
export async function simpanLangkahSelesai(tugasId: string, userId: string, ids: string[]): Promise<void> {
  const { error } = await supabase
    .from("tugas_progres")
    .upsert({ tugas_id: tugasId, user_id: userId, langkah_selesai: ids, diperbarui_at: new Date().toISOString() }, { onConflict: "tugas_id,user_id" });
  if (error) throw galat(error.message);
}

/** Admin: setujui hasil kerja (→ selesai) atau minta revisi dengan catatan. */
export async function periksaTugas(tugasId: string, userId: string, setuju: boolean, catatan: string): Promise<void> {
  const { error } = await supabase.rpc("periksa_tugas", { p_tugas: tugasId, p_user: userId, p_setuju: setuju, p_catatan: catatan });
  if (error) throw galat(error.message);
}

/** Percakapan tanya-jawab satu tugas: pegawai hanya miliknya (RLS), admin semuanya (atau satu pegawai). */
export async function ambilTanya(tugasId: string, userId?: string): Promise<TanyaTugas[]> {
  let q = supabase.from("tugas_tanya").select("*").eq("tugas_id", tugasId).order("dibuat_at");
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw galat(error.message);
  return (data as TanyaTugas[]) ?? [];
}

/** Kirim pesan ke percakapan milik `userId` (pegawai: dirinya sendiri; admin: pegawai yang dijawab). */
export async function kirimTanya(tugasId: string, userId: string, isi: string): Promise<void> {
  const { error } = await supabase.from("tugas_tanya").insert({ tugas_id: tugasId, user_id: userId, isi: isi.trim() });
  if (error) throw galat(error.message);
}

/**
 * Simpan status, catatan, dan lampiran. Lampiran hanya dikirim kalau ada (atau
 * sebelumnya ada), supaya simpan status tetap jalan sebelum migrasi 0039.
 */
export async function simpanProgresTugas(
  tugasId: string,
  userId: string,
  status: StatusTugas,
  catatan: string | null,
  lampiran: Lampiran[] = [],
  adaLampiranLama = false
): Promise<void> {
  const baris: Record<string, unknown> = { tugas_id: tugasId, user_id: userId, status, catatan, diperbarui_at: new Date().toISOString() };
  if (lampiran.length > 0 || adaLampiranLama) baris.lampiran = lampiran;
  const { error } = await supabase.from("tugas_progres").upsert(baris, { onConflict: "tugas_id,user_id" });
  if (error) throw galat(error.message);
}

/* ---------- Lampiran pengerjaan (bucket privat tugas_lampiran, migrasi 0039) ---------- */

/**
 * Unggah satu file lampiran ke `folder` (lihat folderLampiran…). Gambar foto
 * dikompres dulu (JPEG ±1 MB); kalau tidak bisa dikompres (mis. HEIC), file asli dipakai.
 */
export async function unggahLampiran(
  folder: string,
  file: File,
  onProgres: (persen: number) => void,
  onKompres?: () => void
): Promise<Lampiran> {
  let tipe = tipeKonten(file.name);
  if (!tipe) throw new Error(`Jenis file "${file.name}" belum didukung.`);
  let isi: Blob = file;
  let nama = file.name;
  if (perluKompres(tipe)) {
    onKompres?.();
    try {
      const kecil = await kompresGambar(file, SISI_MAKS_GAMBAR, TARGET_UKURAN_GAMBAR);
      if (kecil.size < file.size) {
        isi = kecil;
        tipe = "image/jpeg";
        nama = `${nama.replace(/\.[^.]+$/, "")}.jpg`;
      }
    } catch {
      // tidak bisa dibaca browser ini — unggah apa adanya
    }
  }
  if (isi.size > MAKS_UKURAN_FILE) {
    throw new Error(`terlalu besar (${formatUkuran(isi.size)}), maksimal ${formatUkuran(MAKS_UKURAN_FILE)}. Kirim lewat link saja.`);
  }
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${namaFileAman(nama)}`;
  await unggahDenganProgres({
    bucket: BUCKET_LAMPIRAN,
    path,
    isi,
    tipe,
    onProgres,
    pesanBelumAktif: PESAN_LAMPIRAN_BELUM_AKTIF,
    // folder materi/ ditolak RLS kalau policy 0040 belum ada
    pesanDitolak: folder.startsWith("materi/") ? PESAN_MATERI_BELUM_AKTIF : undefined,
  });
  return { jenis: jenisDariTipe(tipe), nama, path, ukuran: isi.size, tipe };
}

/** Hapus file lampiran dari Storage (gagal pun tidak apa-apa — paling jadi file yatim). */
export async function hapusFileLampiran(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET_LAMPIRAN).remove(paths);
}

/** URL sementara (1 jam) untuk membuka/memutar lampiran: path → URL. */
export async function urlLampiran(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET_LAMPIRAN).createSignedUrls(paths, 3600);
  if (error || !data) return {};
  const hasil: Record<string, string> = {};
  for (const x of data) if (x.path && x.signedUrl) hasil[x.path] = x.signedUrl;
  return hasil;
}

/** Isi file lampiran (untuk pratinjau di aplikasi) — lewat sesi login, jadi tidak ada link yang kedaluwarsa. */
export async function ambilIsiLampiran(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET_LAMPIRAN).download(path);
  if (error || !data) throw new Error("File tidak bisa dibuka. Mungkin sudah dihapus, atau koneksi terputus.");
  return data;
}

/** Link unduh 5 menit dengan nama file asli (bukan nama acak di Storage). Dibuat saat tombol ditekan. */
export async function urlUnduhLampiran(path: string, nama: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_LAMPIRAN).createSignedUrl(path, 300, { download: nama });
  if (error || !data) throw new Error("File tidak bisa diunduh. Mungkin sudah dihapus, atau koneksi terputus.");
  return data.signedUrl;
}

/** Duplikat tugas: salin file materi ke folder tugas baru (materi/{id baru}/…). */
export async function salinLampiranMateri(lampiran: Lampiran[], tugasIdBaru: string): Promise<Lampiran[]> {
  const hasil: Lampiran[] = [];
  for (const l of lampiran) {
    if (!l.path) {
      hasil.push(l);
      continue;
    }
    const tujuan = `materi/${tugasIdBaru}/${l.path.split("/").pop()}`;
    const { error } = await supabase.storage.from(BUCKET_LAMPIRAN).copy(l.path, tujuan);
    if (!error) hasil.push({ ...l, path: tujuan });
  }
  return hasil;
}

export function pathLampiran(lampiran: Lampiran[] | undefined): string[] {
  return (lampiran ?? []).flatMap((l) => (l.path ? [l.path] : []));
}

/* ---------- Admin ---------- */

export async function ambilSemuaTugas(): Promise<{
  tugas: TugasDenganPembuat[];
  progres: ProgresTugas[];
  dibaca: { tugas_id: string; user_id: string; dibaca_at: string }[];
  tanya: TanyaTugas[];
}> {
  const [t, p, b, q] = await Promise.all([
    supabase.from("tugas").select("*, pembuat:dibuat_oleh(nama)").order("created_at", { ascending: false }),
    supabase.from("tugas_progres").select("*"),
    supabase.from("tugas_dibaca").select("*"),
    supabase.from("tugas_tanya").select("*").order("dibuat_at"),
  ]);
  if (t.error) throw galat(t.error.message);
  if (p.error) throw galat(p.error.message);
  // tugas_dibaca & tugas_tanya baru ada setelah 0041
  return {
    tugas: (t.data as TugasDenganPembuat[]) ?? [],
    progres: (p.data as ProgresTugas[]) ?? [],
    dibaca: b.error ? [] : ((b.data as { tugas_id: string; user_id: string; dibaca_at: string }[]) ?? []),
    tanya: q.error ? [] : ((q.data as TanyaTugas[]) ?? []),
  };
}

/**
 * Simpan tugas. Tugas baru memakai `idBaru` yang dibuat di aplikasi, supaya
 * lampirannya bisa diunggah ke materi/{id}/ sebelum tugasnya ada di database.
 * Kolom lampiran hanya dikirim kalau ada isinya (simpan tetap jalan sebelum 0040).
 */
export async function simpanTugas(id: string | null, isi: IsiTugas, idBaru?: string): Promise<void> {
  const baru: Record<string, unknown> = idBaru ? { id: idBaru, ...isi } : { ...isi };
  const { error } = id ? await supabase.from("tugas").update(isi).eq("id", id) : await supabase.from("tugas").insert(baru);
  if (error) throw galat(error.message);
}

/** Pin dari admin: tugas tetap paling atas di daftar admin & pegawai. Mengembalikan waktu sematan (null = dilepas). */
export async function sematkanTugas(id: string, sematkan: boolean): Promise<string | null> {
  const disematkan_at = sematkan ? new Date().toISOString() : null;
  const { error } = await supabase.from("tugas").update({ disematkan_at }).eq("id", id);
  if (error) throw galat(error.message);
  return disematkan_at;
}

export async function ubahAktifTugas(id: string, aktif: boolean): Promise<void> {
  const { error } = await supabase.from("tugas").update({ aktif }).eq("id", id);
  if (error) throw galat(error.message);
}

export async function hapusTugas(id: string): Promise<void> {
  // file lampiran pegawai & materi ikut dibersihkan (baris progres terhapus otomatis lewat cascade)
  const [progres, tugas] = await Promise.all([
    supabase.from("tugas_progres").select("lampiran").eq("tugas_id", id),
    supabase.from("tugas").select("lampiran").eq("id", id),
  ]);
  const paths = [...((progres.data as { lampiran?: Lampiran[] }[] | null) ?? []), ...((tugas.data as { lampiran?: Lampiran[] }[] | null) ?? [])].flatMap((r) =>
    pathLampiran(r.lampiran)
  );
  await hapusFileLampiran(paths).catch(() => {});
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
