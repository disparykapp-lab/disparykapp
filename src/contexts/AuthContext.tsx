import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Divisi, Profile } from "../types/database";
import { hapusTujuanGoogle, simpanTujuanGoogle } from "../lib/alurGoogle";
import type { Penolakan } from "../lib/alurGoogle";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  divisi: Divisi | null;
  loading: boolean;
  /** true kalau email sudah login Google tapi ditolak (belum terdaftar / belum aktif) */
  belumTerdaftar: boolean;
  /** alasan & email yang ditolak, untuk pesan di /login dan /daftar */
  penolakan: Penolakan | null;
  /** true kalau sesi terputus sendiri (bukan tombol Keluar), untuk pesan di /login */
  sesiBerakhir: boolean;
  /** admin selalu true; pegawai biasa hanya true kalau divisinya diberi akses */
  bisaKalenderKonten: boolean;
  /** admin selalu true; pegawai biasa hanya true kalau divisinya diberi akses */
  bisaNaskahAi: boolean;
  /** true untuk admin yang ditandai super_admin; belum dipakai di tampilan manapun */
  superAdmin: boolean;
  /**
   * Melempar Error kalau halaman Google gagal dibuka. `pilihAkun` = selalu tampilkan pemilih akun.
   * `kembali` = halaman aplikasi yang dibuka lagi setelah berhasil masuk.
   */
  loginGoogle: (opsi?: { pilihAkun?: boolean; kembali?: string | null }) => Promise<void>;
  /** Login Google untuk mengisi form pendaftaran (/daftar); sesi tanpa profil tidak di-logout otomatis */
  daftarGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const KUNCI_MODE_DAFTAR = "disparyk_mode_daftar";

export function sedangModeDaftar(): boolean {
  try {
    return sessionStorage.getItem(KUNCI_MODE_DAFTAR) === "1";
  } catch {
    return false;
  }
}

function setModeDaftar(aktif: boolean) {
  try {
    if (aktif) sessionStorage.setItem(KUNCI_MODE_DAFTAR, "1");
    else sessionStorage.removeItem(KUNCI_MODE_DAFTAR);
  } catch {
    // sessionStorage bisa tidak tersedia (mode privat); abaikan
  }
}

type ProfileDenganDivisi = Profile & { divisi: Divisi | null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [divisi, setDivisi] = useState<Divisi | null>(null);
  const [loading, setLoading] = useState(true);
  const [penolakan, setPenolakan] = useState<Penolakan | null>(null);
  const [sesiBerakhir, setSesiBerakhir] = useState(false);
  /** id pengguna yang profilnya sudah dimuat, untuk mengenali event dari pengguna yang sama */
  const userDimuat = useRef<string | null>(null);

  const muatProfile = useCallback(async (userId: string, email: string): Promise<boolean> => {
    let { data, error } = await supabase
      .from("profiles")
      .select("*, divisi:divisi_id(*)")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setProfile(null);
      setDivisi(null);
      return false;
    }

    // Belum ada profil dengan id ini — mungkin admin sudah mendaftarkan
    // emailnya lebih dulu (whitelist), coba klaim baris itu.
    if (!data) {
      await supabase.rpc("klaim_profil");
      const ulang = await supabase
        .from("profiles")
        .select("*, divisi:divisi_id(*)")
        .eq("id", userId)
        .maybeSingle();
      data = ulang.data;
    }

    if (!data && sedangModeDaftar()) {
      setPenolakan(null);
      setProfile(null);
      setDivisi(null);
      return false;
    }

    if (!data) {
      setPenolakan({ alasan: "belum_terdaftar", email });
      setProfile(null);
      setDivisi(null);
      await supabase.auth.signOut();
      setSession(null);
      return false;
    }

    if (!data.aktif) {
      setPenolakan({ alasan: "nonaktif", email });
      setProfile(null);
      setDivisi(null);
      await supabase.auth.signOut();
      setSession(null);
      return false;
    }

    const { divisi: divisiTerkait, ...profileSaja } = data as ProfileDenganDivisi;
    setPenolakan(null);
    setSesiBerakhir(false);
    setProfile(profileSaja);
    setDivisi(divisiTerkait);
    return true;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        const u = data.session.user;
        if (await muatProfile(u.id, u.email ?? "")) userDimuat.current = u.id;
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const user = newSession?.user ?? null;
      const userId = user?.id ?? null;
      // Pengguna sama (token diperbarui, kembali ke tab, sinyal dari tab lain): profil
      // tidak berubah, jadi jangan tampilkan layar "memeriksa" yang membuang isi halaman.
      if (userId && userId === userDimuat.current) return;
      if (user && userId) {
        setLoading(true);
        userDimuat.current = (await muatProfile(userId, user.email ?? "")) ? userId : null;
        setLoading(false);
      } else {
        // Keluar tanpa lewat tombol Keluar (logout() mengosongkan userDimuat lebih dulu):
        // sesi dicabut/kedaluwarsa, atau keluar dari tab lain.
        if (userDimuat.current) setSesiBerakhir(true);
        userDimuat.current = null;
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [muatProfile]);

  // Supabase mengembalikan pengguna ke alamat utama; halaman asal dicatat dulu
  // supaya PengarahGoogle bisa membawanya ke /daftar atau /login lagi.
  const loginGoogle = useCallback(async (opsi?: { pilihAkun?: boolean; kembali?: string | null }) => {
    setModeDaftar(false);
    simpanTujuanGoogle("/login", opsi?.kembali);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        ...(opsi?.pilihAkun ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });
    if (error) {
      hapusTujuanGoogle();
      throw new Error("Halaman Google gagal dibuka. Periksa koneksi lalu coba lagi.");
    }
  }, []);

  const daftarGoogle = useCallback(async () => {
    setModeDaftar(true);
    simpanTujuanGoogle("/daftar");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setModeDaftar(false);
      hapusTujuanGoogle();
      throw new Error("Halaman Google gagal dibuka. Periksa koneksi lalu coba lagi.");
    }
  }, []);

  const logout = useCallback(async () => {
    setModeDaftar(false);
    hapusTujuanGoogle();
    userDimuat.current = null;
    // Hanya perangkat ini. Bawaan supabase-js ("global") ikut mencabut sesi di HP/laptop
    // lain, yang lalu ditolak Edge Function ("Sesi tidak valid.") walau tampak masih masuk.
    await supabase.auth.signOut({ scope: "local" });
    setProfile(null);
    setDivisi(null);
    setSession(null);
    setPenolakan(null);
    setSesiBerakhir(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await muatProfile(session.user.id, session.user.email ?? "");
    }
  }, [session, muatProfile]);

  const bisaKalenderKonten = profile?.role === "admin" || !!divisi?.fitur_kalender_konten;
  const bisaNaskahAi = profile?.role === "admin" || !!divisi?.fitur_naskah_ai;
  const superAdmin = profile?.role === "admin" && profile?.super_admin === true;
  const belumTerdaftar = penolakan !== null;

  const value = useMemo(
    () => ({
      session,
      profile,
      divisi,
      loading,
      belumTerdaftar,
      penolakan,
      sesiBerakhir,
      bisaKalenderKonten,
      bisaNaskahAi,
      superAdmin,
      loginGoogle,
      daftarGoogle,
      logout,
      refreshProfile,
    }),
    [
      session,
      profile,
      divisi,
      loading,
      belumTerdaftar,
      penolakan,
      sesiBerakhir,
      bisaKalenderKonten,
      bisaNaskahAi,
      superAdmin,
      loginGoogle,
      daftarGoogle,
      logout,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
