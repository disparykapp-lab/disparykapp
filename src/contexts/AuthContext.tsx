import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Divisi, Profile } from "../types/database";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  divisi: Divisi | null;
  loading: boolean;
  /** true kalau email sudah login Google tapi belum terdaftar di tabel profiles */
  belumTerdaftar: boolean;
  /** admin selalu true; pegawai biasa hanya true kalau divisinya diberi akses */
  bisaKalenderKonten: boolean;
  loginGoogle: () => Promise<void>;
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
  const [belumTerdaftar, setBelumTerdaftar] = useState(false);

  const muatProfile = useCallback(async (userId: string) => {
    let { data, error } = await supabase
      .from("profiles")
      .select("*, divisi:divisi_id(*)")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setProfile(null);
      setDivisi(null);
      return;
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
      setBelumTerdaftar(false);
      setProfile(null);
      setDivisi(null);
      return;
    }

    if (!data) {
      setBelumTerdaftar(true);
      setProfile(null);
      setDivisi(null);
      await supabase.auth.signOut();
      setSession(null);
      return;
    }

    if (!data.aktif) {
      setBelumTerdaftar(true);
      setProfile(null);
      setDivisi(null);
      await supabase.auth.signOut();
      setSession(null);
      return;
    }

    const { divisi: divisiTerkait, ...profileSaja } = data as ProfileDenganDivisi;
    setBelumTerdaftar(false);
    setProfile(profileSaja);
    setDivisi(divisiTerkait);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await muatProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setLoading(true);
        await muatProfile(newSession.user.id);
        setLoading(false);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [muatProfile]);

  const loginGoogle = useCallback(async () => {
    setModeDaftar(false);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const daftarGoogle = useCallback(async () => {
    setModeDaftar(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
  }, []);

  const logout = useCallback(async () => {
    setModeDaftar(false);
    await supabase.auth.signOut();
    setProfile(null);
    setDivisi(null);
    setSession(null);
    setBelumTerdaftar(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await muatProfile(session.user.id);
    }
  }, [session, muatProfile]);

  const bisaKalenderKonten = profile?.role === "admin" || !!divisi?.fitur_kalender_konten;

  const value = useMemo(
    () => ({
      session,
      profile,
      divisi,
      loading,
      belumTerdaftar,
      bisaKalenderKonten,
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
      bisaKalenderKonten,
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
