import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/database";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** true kalau email sudah login Google tapi belum terdaftar di tabel profiles */
  belumTerdaftar: boolean;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [belumTerdaftar, setBelumTerdaftar] = useState(false);

  const muatProfile = useCallback(async (userId: string) => {
    let { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setProfile(null);
      return;
    }

    // Belum ada profil dengan id ini — mungkin admin sudah mendaftarkan
    // emailnya lebih dulu (whitelist), coba klaim baris itu.
    if (!data) {
      await supabase.rpc("klaim_profil");
      const ulang = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      data = ulang.data;
    }

    if (!data) {
      setBelumTerdaftar(true);
      setProfile(null);
      await supabase.auth.signOut();
      setSession(null);
      return;
    }

    if (!data.aktif) {
      setBelumTerdaftar(true);
      setProfile(null);
      await supabase.auth.signOut();
      setSession(null);
      return;
    }

    setBelumTerdaftar(false);
    setProfile(data as Profile);
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
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setBelumTerdaftar(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await muatProfile(session.user.id);
    }
  }, [session, muatProfile]);

  const value = useMemo(
    () => ({ session, profile, loading, belumTerdaftar, loginGoogle, logout, refreshProfile }),
    [session, profile, loading, belumTerdaftar, loginGoogle, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
