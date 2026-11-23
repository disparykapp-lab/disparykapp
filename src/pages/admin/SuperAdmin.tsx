import { useEffect, useId, useState } from "react";
import { History, ShieldCheck, UserCog } from "lucide-react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { formatTanggal } from "../../lib/tanggal";
import { superAdminSetFlag } from "../../lib/absensi";
import type { Profile } from "../../types/database";
import PanelKoreksiAbsen from "./superadmin/PanelKoreksiAbsen";

type Tab = "absensi" | "akses" | "log";

const TAB: { id: Tab; label: string; labelPanjang?: string; ikon: typeof History }[] = [
  { id: "absensi", label: "Koreksi", labelPanjang: "Koreksi Absensi", ikon: UserCog },
  { id: "akses", label: "Akses", ikon: ShieldCheck },
  { id: "log", label: "Log", ikon: History },
];

export default function SuperAdmin() {
  const idDasar = useId();
  const [tab, setTab] = useState<Tab>("absensi");

  return (
    <div className="kolom-sempit flex flex-col gap-4">
      <HeaderHalaman judul="Super Admin" kembaliKe="/kelola" />

      <div role="tablist" aria-label="Menu super admin" className="grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-sm">
        {TAB.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idDasar}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${idDasar}-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors ${
              tab === t.id ? "bg-brand-masuk text-white" : "text-gray-500"
            }`}
          >
            <t.ikon size={15} className="shrink-0" />
            {t.labelPanjang ? (
              <>
                <span className="sm:hidden">{t.label}</span>
                <span className="hidden sm:inline">{t.labelPanjang}</span>
              </>
            ) : (
              t.label
            )}
          </button>
        ))}
      </div>

      {/* Koreksi tetap terpasang saat pindah tab supaya isian yang belum disimpan tidak hilang */}
      <div role="tabpanel" id={`${idDasar}-panel-absensi`} aria-labelledby={`${idDasar}-tab-absensi`} hidden={tab !== "absensi"}>
        <PanelKoreksiAbsen />
      </div>
      {tab === "akses" && (
        <div role="tabpanel" id={`${idDasar}-panel-akses`} aria-labelledby={`${idDasar}-tab-akses`}>
          <PanelAkses />
        </div>
      )}
      {tab === "log" && (
        <div role="tabpanel" id={`${idDasar}-panel-log`} aria-labelledby={`${idDasar}-tab-log`}>
          <PanelLog />
        </div>
      )}
    </div>
  );
}

function PanelAkses() {
  const { profile: profileSaya } = useAuth();
  const [list, setList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mengubahId, setMengubahId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function muat() {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").eq("role", "admin").order("nama");
    if (error) setError(error.message);
    setList((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void muat();
  }, []);

  async function toggle(p: Profile) {
    setMengubahId(p.id);
    setError(null);
    try {
      await superAdminSetFlag(p.id, !p.super_admin);
      await muat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status.");
    } finally {
      setMengubahId(null);
    }
  }

  if (loading) return <Loading teks="Memuat daftar admin..." />;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Hanya akun dengan role <strong>admin</strong> yang bisa dijadikan super admin. Status
        ini tidak mengubah tampilan apa pun untuk mereka sampai fitur khusus super admin
        dipakai.
      </div>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-col gap-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-brand-text">
                {p.nama} {p.id === profileSaya?.id && <span className="text-gray-400">(kamu)</span>}
              </p>
              <p className="text-xs text-gray-500">{p.email}</p>
            </div>
            <button
              onClick={() => void toggle(p)}
              disabled={mengubahId === p.id}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                p.super_admin ? "bg-brand-masuk text-white" : "border border-gray-300 text-brand-text"
              }`}
            >
              {mengubahId === p.id ? "..." : p.super_admin ? "Super Admin" : "Jadikan Super Admin"}
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">Belum ada admin.</p>}
      </div>
    </div>
  );
}

interface BarisLog {
  id: string;
  aksi: string;
  detail: Record<string, unknown> | null;
  dibuat_at: string;
  profiles: { nama: string } | null;
}

interface BarisLoginAdmin {
  user_id: string;
  nama: string;
  email: string;
  last_sign_in_at: string | null;
  /** Login Google atau sesi terakhir diperpanjang (aplikasi dibuka) — lihat 0030. Belum ada sebelum 0030 dijalankan. */
  terakhir_aktif?: string | null;
}

const LABEL_AKSI: Record<string, string> = {
  set_absensi: "Buat/ubah absensi",
  hapus_absensi: "Hapus absensi",
  set_flag_super_admin: "Ubah status super admin",
  hapus_naskah_ai: "Hapus riwayat naskah AI",
};

function PanelLog() {
  const [rows, setRows] = useState<BarisLog[]>([]);
  const [login, setLogin] = useState<BarisLoginAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(true);

  useEffect(() => {
    supabase
      .from("log_super_admin")
      .select("*, profiles(nama)")
      .order("dibuat_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as BarisLog[]) ?? []);
        setLoading(false);
      });

    supabase.rpc("super_admin_login_admin").then(({ data }) => {
      setLogin((data as BarisLoginAdmin[]) ?? []);
      setLoadingLogin(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-brand-text">Terakhir Aktif Admin</p>
        {loadingLogin ? (
          <Loading teks="Memuat info login..." />
        ) : (
          <div className="flex flex-col gap-2">
            {login.map((a) => {
              const waktu = a.terakhir_aktif ?? a.last_sign_in_at;
              return (
                <div key={a.user_id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm shadow-sm">
                  <div>
                    <p className="font-semibold text-brand-text">{a.nama}</p>
                    <p className="text-xs text-gray-500">{a.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {waktu ? formatTanggal(waktu, "d MMM yyyy HH:mm") : "Belum pernah login"}
                  </span>
                </div>
              );
            })}
            {login.length === 0 && (
              <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">Belum ada admin.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-brand-text">Riwayat Aksi Super Admin</p>
        {loading ? (
          <Loading teks="Memuat log..." />
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <details key={r.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <summary className="cursor-pointer">
                  <strong className="text-brand-text">{r.profiles?.nama ?? "?"}</strong> ·{" "}
                  {LABEL_AKSI[r.aksi] ?? r.aksi} ·{" "}
                  <span className="text-xs text-gray-400">{formatTanggal(r.dibuat_at, "d MMM yyyy HH:mm")}</span>
                </summary>
                {r.detail && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-2 text-[11px] text-gray-600">
                    {JSON.stringify(r.detail, null, 2)}
                  </pre>
                )}
              </details>
            ))}
            {rows.length === 0 && (
              <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">Belum ada aktivitas.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
