import { useEffect, useMemo, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import SearchBarAnimasi from "../../components/SearchBarAnimasi";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { formatTanggal } from "../../lib/tanggal";
import { superAdminSetAbsensi, superAdminHapusAbsensi, superAdminSetFlag } from "../../lib/absensi";
import { LABEL_STATUS_ABSEN } from "../../lib/absensiMeta";
import type { Absensi, ModeAbsen, Profile, StatusAbsen } from "../../types/database";

type Tab = "absensi" | "akses" | "log";

export default function SuperAdmin() {
  const [tab, setTab] = useState<Tab>("absensi");

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Super Admin" kembaliKe="/kelola" />

      <div className="flex gap-2 rounded-xl bg-white p-1 shadow-sm">
        <TombolTab aktif={tab === "absensi"} onClick={() => setTab("absensi")}>
          Koreksi Absensi
        </TombolTab>
        <TombolTab aktif={tab === "akses"} onClick={() => setTab("akses")}>
          Akses Super Admin
        </TombolTab>
        <TombolTab aktif={tab === "log"} onClick={() => setTab("log")}>
          Log Aktivitas
        </TombolTab>
      </div>

      {tab === "absensi" && <PanelAbsensi />}
      {tab === "akses" && <PanelAkses />}
      {tab === "log" && <PanelLog />}
    </div>
  );
}

function TombolTab({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
        aktif ? "bg-brand-masuk text-white" : "text-gray-500"
      }`}
    >
      {children}
    </button>
  );
}

function defaultHariIni() {
  return new Date().toISOString().slice(0, 10);
}

/** "2026-10-08" + "07:30" -> ISO dengan offset WIB tetap (+07:00, tidak ada DST). */
function keIsoWib(tanggal: string, jam: string): string | null {
  if (!jam) return null;
  return `${tanggal}T${jam}:00+07:00`;
}

/** ISO/timestamptz -> "07:30" buat ditampilkan di <input type="time">. */
function keJamInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const jam = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return jam;
}

interface FormAbsensi {
  masukJam: string;
  masukMode: ModeAbsen;
  masukAkurasi: string;
  masukIp: string;
  keluarJam: string;
  keluarMode: ModeAbsen;
  keluarAkurasi: string;
  keluarIp: string;
  status: StatusAbsen;
  catatan: string;
}

const FORM_KOSONG: FormAbsensi = {
  masukJam: "",
  masukMode: "kantor",
  masukAkurasi: "",
  masukIp: "",
  keluarJam: "",
  keluarMode: "kantor",
  keluarAkurasi: "",
  keluarIp: "",
  status: "hadir",
  catatan: "",
};

function PanelAbsensi() {
  const [pegawaiList, setPegawaiList] = useState<Profile[]>([]);
  const [cari, setCari] = useState("");
  const [pegawaiId, setPegawaiId] = useState("");
  const [tanggal, setTanggal] = useState(defaultHariIni());
  const [baris, setBaris] = useState<Absensi | null>(null);
  const [form, setForm] = useState<FormAbsensi>(FORM_KOSONG);
  const [memuatBaris, setMemuatBaris] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menghapus, setMenghapus] = useState(false);
  const [pesan, setPesan] = useState<{ tipe: "ok" | "error"; teks: string } | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("aktif", true)
      .order("nama")
      .then(({ data }) => setPegawaiList((data as Profile[]) ?? []));
  }, []);

  const pegawaiTersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return pegawaiList;
    return pegawaiList.filter((p) => p.nama.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [pegawaiList, cari]);

  const pegawaiTerpilih = pegawaiList.find((p) => p.id === pegawaiId) ?? null;

  useEffect(() => {
    if (!pegawaiId || !tanggal) {
      setBaris(null);
      setForm(FORM_KOSONG);
      return;
    }
    setMemuatBaris(true);
    setPesan(null);
    supabase
      .from("absensi")
      .select("*")
      .eq("user_id", pegawaiId)
      .eq("tanggal", tanggal)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as Absensi | null;
        setBaris(row);
        setForm(
          row
            ? {
                masukJam: keJamInput(row.masuk_at),
                masukMode: row.masuk_mode ?? "kantor",
                masukAkurasi: row.masuk_akurasi != null ? String(row.masuk_akurasi) : "",
                masukIp: row.masuk_ip ?? "",
                keluarJam: keJamInput(row.keluar_at),
                keluarMode: row.keluar_mode ?? "kantor",
                keluarAkurasi: row.keluar_akurasi != null ? String(row.keluar_akurasi) : "",
                keluarIp: row.keluar_ip ?? "",
                status: row.status,
                catatan: row.catatan_klarifikasi ?? "",
              }
            : FORM_KOSONG
        );
        setMemuatBaris(false);
      });
  }, [pegawaiId, tanggal]);

  async function simpan() {
    if (!pegawaiId || !tanggal) return;
    setMenyimpan(true);
    setPesan(null);
    try {
      await superAdminSetAbsensi({
        userId: pegawaiId,
        tanggal,
        masukAt: keIsoWib(tanggal, form.masukJam),
        masukMode: form.masukJam ? form.masukMode : null,
        masukAkurasi: form.masukAkurasi ? Number(form.masukAkurasi) : null,
        masukIp: form.masukIp || null,
        masukLat: baris?.masuk_lat ?? null,
        masukLng: baris?.masuk_lng ?? null,
        keluarAt: keIsoWib(tanggal, form.keluarJam),
        keluarMode: form.keluarJam ? form.keluarMode : null,
        keluarAkurasi: form.keluarAkurasi ? Number(form.keluarAkurasi) : null,
        keluarIp: form.keluarIp || null,
        keluarLat: baris?.keluar_lat ?? null,
        keluarLng: baris?.keluar_lng ?? null,
        status: form.status,
        catatanKlarifikasi: form.catatan || null,
      });
      setPesan({ tipe: "ok", teks: "Tersimpan." });
      // muat ulang baris supaya id/foto/dsb ikut terbaru
      const { data } = await supabase
        .from("absensi")
        .select("*")
        .eq("user_id", pegawaiId)
        .eq("tanggal", tanggal)
        .maybeSingle();
      setBaris((data as Absensi) ?? null);
    } catch (e) {
      setPesan({ tipe: "error", teks: e instanceof Error ? e.message : "Gagal menyimpan." });
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!baris) return;
    if (!window.confirm(`Hapus baris absensi ${pegawaiTerpilih?.nama ?? ""} tanggal ${formatTanggal(tanggal)}? Tidak bisa dibatalkan.`)) return;
    setMenghapus(true);
    setPesan(null);
    try {
      await superAdminHapusAbsensi(baris.id);
      setBaris(null);
      setForm(FORM_KOSONG);
      setPesan({ tipe: "ok", teks: "Baris absensi dihapus." });
    } catch (e) {
      setPesan({ tipe: "error", teks: e instanceof Error ? e.message : "Gagal menghapus." });
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Perubahan di sini langsung menulis ulang data kehadiran pegawai (termasuk status,
        jam, GPS, dan IP) tanpa lewat alur absen normal. Setiap aksi tercatat di tab
        <strong> Log Aktivitas</strong>.
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm">
        <SearchBarAnimasi value={cari} onChange={setCari} placeholder="Cari nama/email pegawai..." />
        <select
          value={pegawaiId}
          onChange={(e) => setPegawaiId(e.target.value)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
        >
          <option value="">— Pilih pegawai —</option>
          {pegawaiTersaring.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama} ({p.email})
            </option>
          ))}
        </select>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </div>

      {pegawaiId && tanggal && (
        <div className="flex flex-col gap-4 rounded-xl bg-white p-3 shadow-sm">
          {memuatBaris ? (
            <Loading teks="Memuat data absensi..." />
          ) : (
            <>
              <p className="text-xs text-gray-400">
                {baris ? "Baris absensi sudah ada — mengubah yang sudah ada." : "Belum ada baris absensi untuk tanggal ini — akan dibuat baru."}
              </p>

              <SesiForm
                judul="Masuk"
                jam={form.masukJam}
                onJam={(v) => setForm((f) => ({ ...f, masukJam: v }))}
                mode={form.masukMode}
                onMode={(v) => setForm((f) => ({ ...f, masukMode: v }))}
                akurasi={form.masukAkurasi}
                onAkurasi={(v) => setForm((f) => ({ ...f, masukAkurasi: v }))}
                ip={form.masukIp}
                onIp={(v) => setForm((f) => ({ ...f, masukIp: v }))}
              />
              <SesiForm
                judul="Pulang"
                jam={form.keluarJam}
                onJam={(v) => setForm((f) => ({ ...f, keluarJam: v }))}
                mode={form.keluarMode}
                onMode={(v) => setForm((f) => ({ ...f, keluarMode: v }))}
                akurasi={form.keluarAkurasi}
                onAkurasi={(v) => setForm((f) => ({ ...f, keluarAkurasi: v }))}
                ip={form.keluarIp}
                onIp={(v) => setForm((f) => ({ ...f, keluarIp: v }))}
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-brand-text">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusAbsen }))}
                  className="rounded-lg border border-gray-300 p-2 text-sm"
                >
                  {(Object.keys(LABEL_STATUS_ABSEN) as StatusAbsen[]).map((s) => (
                    <option key={s} value={s}>
                      {LABEL_STATUS_ABSEN[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-brand-text">Keterangan (opsional)</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                  rows={2}
                  className="rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>

              {pesan && (
                <p className={`text-xs ${pesan.tipe === "ok" ? "text-green-600" : "text-red-600"}`}>{pesan.teks}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => void simpan()}
                  disabled={menyimpan}
                  className="min-h-[44px] flex-1 rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
                >
                  {menyimpan ? "Menyimpan..." : "Simpan"}
                </button>
                {baris && (
                  <button
                    onClick={() => void hapus()}
                    disabled={menghapus}
                    className="min-h-[44px] rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 disabled:opacity-60"
                  >
                    {menghapus ? "Menghapus..." : "Hapus Baris"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SesiForm({
  judul,
  jam,
  onJam,
  mode,
  onMode,
  akurasi,
  onAkurasi,
  ip,
  onIp,
}: {
  judul: string;
  jam: string;
  onJam: (v: string) => void;
  mode: ModeAbsen;
  onMode: (v: ModeAbsen) => void;
  akurasi: string;
  onAkurasi: (v: string) => void;
  ip: string;
  onIp: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-brand-text">{judul}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="time"
          value={jam}
          onChange={(e) => onJam(e.target.value)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
          aria-label={`Jam ${judul}`}
        />
        <select
          value={mode}
          onChange={(e) => onMode(e.target.value as ModeAbsen)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
          aria-label={`Mode ${judul}`}
        >
          <option value="kantor">Di Kantor</option>
          <option value="luar">Dinas Luar</option>
        </select>
        <input
          type="number"
          value={akurasi}
          onChange={(e) => onAkurasi(e.target.value)}
          placeholder="Akurasi GPS (m)"
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
        <input
          type="text"
          value={ip}
          onChange={(e) => onIp(e.target.value)}
          placeholder="IP"
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </div>
      {!jam && <p className="text-[11px] text-gray-400">Kosong = belum absen {judul.toLowerCase()}.</p>}
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

const LABEL_AKSI: Record<string, string> = {
  set_absensi: "Buat/ubah absensi",
  hapus_absensi: "Hapus absensi",
  set_flag_super_admin: "Ubah status super admin",
};

function PanelLog() {
  const [rows, setRows] = useState<BarisLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("log_super_admin")
      .select("*, profiles:oleh_user_id(nama)")
      .order("dibuat_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as BarisLog[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <Loading teks="Memuat log..." />;

  return (
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
      {rows.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">Belum ada aktivitas.</p>}
    </div>
  );
}
