import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Memanggil Edge Function (naskah-ai, penyusup-tod) dengan sesi login yang pasti berlaku.
//
// Edge Function memeriksa sesi ke server Auth (auth.getUser), yang lebih ketat
// daripada tabel biasa: token dari sesi yang sudah dicabut (mis. akun ini keluar
// di perangkat lain) masih diterima tabel sampai kedaluwarsa (±1 jam), tapi
// ditolak Edge Function dengan "Sesi tidak valid." Kalau supabase-js gagal
// memperbarui token, ia juga diam-diam mengirim anon key dengan hasil yang sama.
// Di sini token dikirim eksplisit; kalau ditolak, sesi diperbarui lalu dicoba
// sekali lagi. Kalau sesi memang mati, pengguna dikeluarkan supaya bisa masuk lagi.

export class SesiBerakhirError extends Error {
  constructor() {
    super("Sesi login kamu sudah berakhir. Masuk lagi untuk melanjutkan.");
    this.name = "SesiBerakhirError";
  }
}

const PESAN_JARINGAN = "Koneksi ke server terputus. Tunggu sebentar lalu coba lagi.";

async function tokenSaatIni(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Token baru, atau melempar SesiBerakhirError (sesi mati) / Error (jaringan). */
async function perbaruiSesi(): Promise<string> {
  const { data, error } = await supabase.auth.refreshSession();
  if (!error && data.session) return data.session.access_token;
  if (error && isAuthRetryableFetchError(error)) throw new Error(PESAN_JARINGAN);
  // Refresh token ditolak server: sesi ini sudah dicabut. Keluar di perangkat ini saja.
  await supabase.auth.signOut({ scope: "local" });
  throw new SesiBerakhirError();
}

/** Edge Function mengembalikan { error: "..." }; supabase-js cuma memberi error generik. */
async function pesanGalat(error: { name?: string; message: string; context?: unknown }): Promise<string> {
  if (error.name === "FunctionsFetchError") return PESAN_JARINGAN;
  const konteks = error.context;
  if (konteks instanceof Response) {
    try {
      const isi = (await konteks.clone().json()) as { error?: unknown; message?: unknown };
      if (typeof isi.error === "string") return isi.error;
      if (typeof isi.message === "string") return isi.message;
    } catch {
      // bukan JSON; pakai pesan generik
    }
  }
  return error.message;
}

function statusGalat(error: { context?: unknown }): number | null {
  return error.context instanceof Response ? error.context.status : null;
}

export async function panggilFungsi<T>(nama: string, body: Record<string, unknown>): Promise<T> {
  let token = (await tokenSaatIni()) ?? (await perbaruiSesi());
  for (let percobaan = 1; ; percobaan++) {
    const { data, error } = await supabase.functions.invoke(nama, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!error) return data as T;
    if (statusGalat(error) === 401 && percobaan === 1) {
      token = await perbaruiSesi();
      continue;
    }
    if (statusGalat(error) === 401) {
      // Sesi baru saja diperbarui tapi tetap ditolak: masalah di server, bukan sesi.
      throw new Error(`${await pesanGalat(error)} Coba keluar lalu masuk lagi; kalau masih sama, hubungi admin.`);
    }
    throw new Error(await pesanGalat(error));
  }
}
