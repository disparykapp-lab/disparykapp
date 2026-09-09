import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";
import {
  ambilKontenById,
  buatKonten,
  hapusKonten,
  updateKonten,
  type SimpanKontenInput,
} from "../lib/konten";
import { LABEL_PLATFORM, LABEL_STATUS_KONTEN } from "../lib/kontenMeta";
import { supabase } from "../lib/supabase";
import type { Divisi, PlatformKonten, Profile, StatusKonten } from "../types/database";

const KOSONG: SimpanKontenInput = {
  judul: "",
  deskripsi: "",
  platform: "instagram",
  tanggal_tayang: new Date().toISOString().slice(0, 10),
  jam_tayang: null,
  status: "ide",
  pic_user_id: null,
  divisi_id: null,
  aset_url: "",
};

export default function KontenForm() {
  const { id } = useParams<{ id: string }>();
  const isBaru = !id;
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [form, setForm] = useState<SimpanKontenInput>(KOSONG);
  const [loading, setLoading] = useState(!isBaru);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pegawaiList, setPegawaiList] = useState<Profile[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [picAsli, setPicAsli] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("aktif", true)
      .then(({ data }) => setPegawaiList((data as Profile[]) ?? []));
    supabase
      .from("divisi")
      .select("*")
      .eq("aktif", true)
      .then(({ data }) => setDivisiList((data as Divisi[]) ?? []));
  }, []);

  useEffect(() => {
    if (isBaru || !id) return;
    ambilKontenById(id)
      .then((data) => {
        if (!data) {
          setError("Konten tidak ditemukan.");
          return;
        }
        setForm({
          judul: data.judul,
          deskripsi: data.deskripsi ?? "",
          platform: data.platform,
          tanggal_tayang: data.tanggal_tayang,
          jam_tayang: data.jam_tayang,
          status: data.status,
          pic_user_id: data.pic_user_id,
          divisi_id: data.divisi_id,
          aset_url: data.aset_url ?? "",
        });
        setPicAsli(data.pic_user_id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat konten."))
      .finally(() => setLoading(false));
  }, [id, isBaru]);

  const isAdmin = profile?.role === "admin";
  const isPic = !!profile && picAsli === profile.id;
  const bisaEditPenuh = isBaru ? isAdmin : isAdmin || isPic;

  async function simpan() {
    if (!profile) return;
    if (!form.judul.trim()) {
      setError("Judul konten wajib diisi.");
      return;
    }
    setMenyimpan(true);
    setError(null);
    try {
      if (isBaru) {
        await buatKonten(form, profile.id);
      } else if (id) {
        await updateKonten(id, form);
      }
      navigate("/kalender");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan konten.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!id) return;
    if (!confirm("Hapus konten ini?")) return;
    setMenyimpan(true);
    try {
      await hapusKonten(id);
      navigate("/kalender");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus konten.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (loading) return <Loading teks="Memuat konten..." />;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate("/kalender")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm"
          aria-label="Kembali"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-brand-text">
          {isBaru ? "Tambah Konten" : bisaEditPenuh ? "Edit Konten" : "Detail Konten"}
        </h1>
      </header>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <Field label="Judul">
          <input
            value={form.judul}
            disabled={!bisaEditPenuh}
            onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            placeholder="Contoh: Promo Wisata Malioboro"
          />
        </Field>

        <Field label="Deskripsi / Caption">
          <textarea
            value={form.deskripsi ?? ""}
            disabled={!bisaEditPenuh}
            onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Platform">
            <select
              value={form.platform}
              disabled={!bisaEditPenuh}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as PlatformKonten }))}
              className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            >
              {(Object.keys(LABEL_PLATFORM) as PlatformKonten[]).map((p) => (
                <option key={p} value={p}>
                  {LABEL_PLATFORM[p]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              disabled={!bisaEditPenuh}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusKonten }))}
              className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            >
              {(Object.keys(LABEL_STATUS_KONTEN) as StatusKonten[]).map((s) => (
                <option key={s} value={s}>
                  {LABEL_STATUS_KONTEN[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal Tayang">
            <input
              type="date"
              value={form.tanggal_tayang}
              disabled={!bisaEditPenuh}
              onChange={(e) => setForm((f) => ({ ...f, tanggal_tayang: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            />
          </Field>
          <Field label="Jam Tayang (opsional)">
            <input
              type="time"
              value={form.jam_tayang ?? ""}
              disabled={!bisaEditPenuh}
              onChange={(e) => setForm((f) => ({ ...f, jam_tayang: e.target.value || null }))}
              className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="PIC (Penanggung Jawab)">
            <select
              value={form.pic_user_id ?? ""}
              disabled={!bisaEditPenuh}
              onChange={(e) => setForm((f) => ({ ...f, pic_user_id: e.target.value || null }))}
              className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            >
              <option value="">- Belum ditentukan -</option>
              {pegawaiList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Divisi">
            <select
              value={form.divisi_id ?? ""}
              disabled={!bisaEditPenuh}
              onChange={(e) => setForm((f) => ({ ...f, divisi_id: e.target.value || null }))}
              className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            >
              <option value="">- Belum ditentukan -</option>
              {divisiList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Link Aset (Canva/Drive)">
          <input
            value={form.aset_url ?? ""}
            disabled={!bisaEditPenuh}
            onChange={(e) => setForm((f) => ({ ...f, aset_url: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 p-3 text-base disabled:bg-gray-50"
            placeholder="https://..."
          />
        </Field>
      </div>

      {(isBaru || bisaEditPenuh) && (
        <div className="flex gap-3">
          {!isBaru && isAdmin && (
            <button
              onClick={() => void hapus()}
              disabled={menyimpan}
              className="min-h-[52px] rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-600"
            >
              Hapus
            </button>
          )}
          <button
            onClick={() => void simpan()}
            disabled={menyimpan}
            className="min-h-[52px] flex-1 rounded-xl bg-brand-masuk text-base font-semibold text-white disabled:opacity-60"
          >
            {menyimpan ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
