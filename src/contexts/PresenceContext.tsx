import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

interface PresenceState {
  /** id pegawai (profiles.id) yang sedang membuka aplikasi sekarang */
  onlineIds: Set<string>;
  jumlahOnline: number;
}

const PresenceContext = createContext<PresenceState>({ onlineIds: new Set(), jumlahOnline: 0 });

/**
 * Status online lewat Supabase Realtime Presence: tiap pegawai yang membuka
 * aplikasi ikut "join" ke satu channel bersama, dan otomatis hilang dari
 * daftar saat tab ditutup. Key presence = profiles.id, jadi satu orang yang
 * membuka beberapa tab tetap dihitung satu. Tidak menyimpan apa pun di database.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const profileId = profile?.id;

  useEffect(() => {
    if (!profileId) {
      setOnlineIds(new Set());
      return;
    }

    const channel = supabase.channel("online-users", {
      config: { presence: { key: profileId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ waktu: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profileId]);

  const value = useMemo(() => ({ onlineIds, jumlahOnline: onlineIds.size }), [onlineIds]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePresence() {
  return useContext(PresenceContext);
}
