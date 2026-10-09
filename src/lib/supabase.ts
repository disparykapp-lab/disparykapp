import { createClient } from "@supabase/supabase-js";
import { drafPratinjau } from "../landing/drafPratinjau";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi di file .env"
  );
}

// Landing yang tampil di iframe pratinjau (Kelola → Landing Page) tidak boleh
// menyentuh sesi login: klien Supabase yang membaca sesi akan mengirim sinyal
// SIGNED_IN ke halaman admin, yang lalu memuat ulang dirinya terus-menerus.
const diPratinjau = drafPratinjau() !== null;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: diPratinjau
    ? { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    : { persistSession: true, autoRefreshToken: true },
});
