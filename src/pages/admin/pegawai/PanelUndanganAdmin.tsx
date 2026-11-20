import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Share2, ShieldCheck } from "lucide-react";
import { ambilUndanganAdmin, batalUndanganAdmin, buatUndanganAdmin, type UndanganDenganNama } from "../../../lib/undanganAdmin";
import { formatWaktuWIB, sisaWaktu, statusUndangan, teksUndangan, urlUndangan } from "../../../lib/undanganAdminAturan";
import type { UndanganAdmin } from "../../../types/database";

const LABEL_SELESAI = { dipakai: "Dipakai", dibatalkan: "Dibatalkan", kedaluwarsa: "Kedaluwarsa", tidak_berlaku: "Tidak berlaku", tidak_ada: "—" } as const;

/** Tab "Admin" di lembar Tambah: buat link pendaftaran admin sekali pakai & bagikan. */
export default function PanelUndanganAdmin() {
  const [catatan, setCatatan] = useState("");
  const [membuat, setMembuat] = useState(false);
  const [baru, setBaru] = useState<UndanganAdmin | null>(null);
  const [daftar, setDaftar] = useState<UndanganDenganNama[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [disalin, setDisalin] = useState<string | null>(null);
  const [yakinBatal, setYakinBatal] = useState<string | null>(null);
  // waktu acuan sisa berlaku; diperbarui tiap daftar dimuat ulang
  const [sekarang, setSekarang] = useState(() => Date.now());

  const muat = useCallback(async () => {
    try {
      setDaftar(await ambilUndanganAdmin());
      setSekarang(Date.now());
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Daftar link gagal dimuat.");
      setDaftar((d) => d ?? []);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function buat() {
    setMembuat(true);
    setGalat(null);
    try {
      const u = await buatUndanganAdmin(catatan);
      setBaru(u);
      setCatatan("");
      await muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Link gagal dibuat.");
    } finally {
      setMembuat(false);
    }
  }

  async function salin(u: Pick<UndanganAdmin, "id" | "kode">) {
    const url = urlUndangan(window.location.origin, u.kode);
    try {
      await navigator.clipboard.writeText(url);
      setDisalin(u.id);
      window.setTimeout(() => setDisalin((x) => (x === u.id ? null : x)), 2000);
    } catch {
      setGalat("Link tidak bisa disalin otomatis. Tekan lama link-nya untuk menyalin.");
    }
  }

  async function bagikan(u: Pick<UndanganAdmin, "id" | "kode" | "berlaku_sampai">) {
    const url = urlUndangan(window.location.origin, u.kode);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Undangan admin DisparYK", text: teksUndangan(u.berlaku_sampai), url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // dibatalkan pengguna
      }
    }
    await salin(u); // browser tanpa menu bagikan: salin saja
  }

  async function batalkan(id: string) {
    setGalat(null);
    try {
      await batalUndanganAdmin(id);
      setYakinBatal(null);
      if (baru?.id === id) setBaru(null);
      await muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Link gagal dibatalkan.");
    }
  }

  const aktif = (daftar ?? []).filter((u) => statusUndangan(u, sekarang) === "berlaku" && u.id !== baru?.id);
  const selesai = (daftar ?? []).filter((u) => statusUndangan(u, sekarang) !== "berlaku").slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-2xl bg-lnd-sky p-3">
        <img src="/icon_setting.png" alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        <p className="text-xs text-gray-700">
          Admin baru cukup membuka link lalu <b>masuk dengan Gmail</b> — tanpa data magang atau persetujuan. Link{" "}
          <b>sekali pakai</b> dan berlaku 7 hari.
        </p>
      </div>

      {baru ? (
        <div className="anim-buka flex flex-col gap-2 rounded-2xl border-2 border-brand-masuk/25 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-brand-masuk">
            <ShieldCheck size={16} /> Link siap dibagikan
          </p>
          {baru.catatan && <p className="text-xs text-gray-500">Untuk: {baru.catatan}</p>}
          <p className="select-all break-all rounded-xl bg-gray-50 p-2.5 font-mono text-[11px] leading-relaxed text-brand-text">
            {urlUndangan(window.location.origin, baru.kode)}
          </p>
          <p className="text-[11px] text-gray-500">Sekali pakai · berlaku sampai {formatWaktuWIB(baru.berlaku_sampai)} WIB</p>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={() => void bagikan(baru)}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
            >
              <Share2 size={16} /> Bagikan link
            </button>
            <button
              type="button"
              onClick={() => void salin(baru)}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-brand-text transition active:scale-95"
            >
              {disalin === baru.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />} {disalin === baru.id ? "Tersalin" : "Salin"}
            </button>
          </div>
          <button type="button" onClick={() => setBaru(null)} className="self-center text-xs font-semibold text-gray-500 underline underline-offset-2">
            Buat link lain
          </button>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-600">Untuk siapa? (opsional, hanya catatan)</span>
            <input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              maxLength={100}
              placeholder="mis. Pak Rudi — Kabid Promosi"
              className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-base focus:border-brand-masuk focus:bg-white focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void buat()}
            disabled={membuat}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            <Link2 size={16} /> {membuat ? "Membuat link…" : "Buat link admin"}
          </button>
        </>
      )}

      {galat && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{galat}</p>}

      {aktif.length > 0 && (
        <section aria-label="Link yang masih berlaku" className="flex flex-col gap-1.5">
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Masih berlaku ({aktif.length})</h3>
          {aktif.map((u) => (
            <div key={u.id} className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-masuk shadow-sm">
                  <Link2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-text">{u.catatan ?? "Link admin"}</p>
                  <p className="text-[11px] text-gray-500">
                    {u.pembuat?.nama ?? "Admin"} · {sisaWaktu(u.berlaku_sampai, sekarang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void bagikan(u)}
                  aria-label={`Bagikan link ${u.catatan ?? "admin"}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-masuk shadow-sm transition active:scale-90"
                >
                  {disalin === u.id ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setYakinBatal(yakinBatal === u.id ? null : u.id)}
                  className="shrink-0 px-1 text-xs font-semibold text-red-600"
                >
                  Batalkan
                </button>
              </div>
              {yakinBatal === u.id && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2">
                  <p className="min-w-0 flex-1 text-xs text-red-800">Link ini langsung tidak bisa dipakai.</p>
                  <button type="button" onClick={() => void batalkan(u.id)} className="min-h-[36px] shrink-0 rounded-lg bg-red-600 px-3 text-xs font-bold text-white">
                    Ya, batalkan
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {selesai.length > 0 && (
        <section aria-label="Riwayat link" className="flex flex-col gap-1">
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Riwayat</h3>
          {selesai.map((u) => {
            const st = statusUndangan(u, sekarang);
            return (
              <div key={u.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-xs">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st === "dipakai" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {LABEL_SELESAI[st as keyof typeof LABEL_SELESAI]}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-600">
                  {st === "dipakai" ? (
                    <>
                      <b className="text-brand-text">{u.pemakai?.nama ?? u.dipakai_email}</b> jadi admin · {formatWaktuWIB(u.dipakai_at ?? u.dibuat_at)}
                    </>
                  ) : (
                    <>
                      {u.catatan ?? "Link admin"} · dibuat {u.pembuat?.nama ?? "admin"}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
