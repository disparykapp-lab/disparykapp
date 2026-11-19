import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Camera, ImageIcon, PackagePlus, Pencil, Trash2 } from "lucide-react";
import Lembar from "../../components/Lembar";
import { useModal } from "../../lib/useModal";
import { useAuth } from "../../contexts/AuthContext";
import { simpanBarang, unggahFotoBarang, urlFotoBarang } from "../../lib/inventaris";
import { BATAS_INVENTARIS, KATEGORI_SARAN, SATUAN_SARAN, validasiBarang, type FormBarang } from "../../lib/inventarisAturan";
import type { BarangInventaris } from "../../types/database";
import { PenghitungJumlah } from "./bersama";
import { KELAS_BARIS_CHIP, kelasChip } from "./gaya";

type Foto = { jenis: "lama"; path: string } | { jenis: "baru"; file: Blob; url: string } | null;

/** Gabung daftar tanpa kembar (tidak peka huruf besar), urutan pertama dipertahankan. */
function unik(list: (string | null | undefined)[]): string[] {
  const sudah = new Set<string>();
  const hasil: string[] = [];
  for (const x of list) {
    const t = x?.trim();
    if (!t || sudah.has(t.toLocaleLowerCase("id"))) continue;
    sudah.add(t.toLocaleLowerCase("id"));
    hasil.push(t);
  }
  return hasil;
}

/** Chip pilihan + "Lainnya…" untuk mengetik sendiri. */
function PilihChip({
  idLabel,
  nilai,
  onUbah,
  pilihan,
  bolehKosong,
  maks,
  placeholder,
}: {
  idLabel: string;
  nilai: string;
  onUbah: (v: string) => void;
  pilihan: string[];
  bolehKosong: boolean;
  maks: number;
  placeholder: string;
}) {
  const [ketik, setKetik] = useState(false);
  const daftar = unik([...pilihan, ketik ? null : nilai]);
  const sama = (a: string) => a.toLocaleLowerCase("id") === nilai.trim().toLocaleLowerCase("id");
  return (
    <div className="flex flex-col gap-2">
      <div className={KELAS_BARIS_CHIP} role="group" aria-labelledby={idLabel}>
        {daftar.map((p) => {
          const aktif = !ketik && sama(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={aktif}
              onClick={() => {
                setKetik(false);
                onUbah(aktif && bolehKosong ? "" : p);
              }}
              className={kelasChip(aktif)}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={ketik}
          onClick={() => {
            setKetik(true);
            onUbah("");
          }}
          className={`${kelasChip(ketik)} border-dashed`}
        >
          Lainnya…
        </button>
      </div>
      {ketik && (
        <input
          autoFocus
          value={nilai}
          maxLength={maks}
          onChange={(e) => onUbah(e.target.value)}
          placeholder={placeholder}
          aria-labelledby={idLabel}
          className="rounded-xl border border-gray-300 p-3 text-base"
        />
      )}
    </div>
  );
}

export default function LembarFormBarang({
  barang,
  namaLain,
  kategoriAda,
  onTutup,
  onTersimpan,
}: {
  /** null = barang baru */
  barang: BarangInventaris | null;
  /** nama barang lain yang masih ada (cek nama kembar) */
  namaLain: string[];
  kategoriAda: string[];
  onTutup: () => void;
  onTersimpan: (id: string) => void;
}) {
  useModal(onTutup);
  const { profile } = useAuth();
  const id = useId();
  const [form, setForm] = useState<FormBarang>(() => ({
    nama: barang?.nama ?? "",
    kategori: barang?.kategori ?? "",
    satuan: barang?.satuan ?? "pcs",
    stokMinimum: barang?.stok_minimum ?? 0,
    stokAwal: 0,
    keterangan: barang?.keterangan ?? "",
  }));
  const [foto, setFoto] = useState<Foto>(barang?.foto_path ? { jenis: "lama", path: barang.foto_path } : null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [persen, setPersen] = useState<number | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const inputKamera = useRef<HTMLInputElement>(null);
  const inputGaleri = useRef<HTMLInputElement>(null);

  const ubah = <K extends keyof FormBarang>(k: K, v: FormBarang[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setGalat(null);
  };

  // URL pratinjau foto baru dilepas saat diganti / lembar ditutup
  const urlBaru = foto?.jenis === "baru" ? foto.url : null;
  useEffect(() => () => {
    if (urlBaru) URL.revokeObjectURL(urlBaru);
  }, [urlBaru]);

  const pilihanKategori = useMemo(() => unik([...kategoriAda, ...KATEGORI_SARAN]), [kategoriAda]);

  function pilihFoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      setGalat("Pilih file gambar (foto).");
      return;
    }
    setFoto({ jenis: "baru", file, url: URL.createObjectURL(file) });
    setGalat(null);
  }

  async function simpan() {
    const pesan = validasiBarang(form, namaLain);
    if (pesan) {
      setGalat(pesan);
      return;
    }
    if (!profile) return;
    setMenyimpan(true);
    setGalat(null);
    try {
      let path: string | null = foto?.jenis === "lama" ? foto.path : null;
      if (foto?.jenis === "baru") {
        setPersen(0);
        path = await unggahFotoBarang(profile.id, foto.file, setPersen);
      }
      setPersen(null);
      const idBarang = await simpanBarang(barang?.id ?? null, form, path);
      onTersimpan(idBarang);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan barang.");
      setPersen(null);
      setMenyimpan(false);
    }
  }

  const pratinjau = foto?.jenis === "baru" ? foto.url : foto?.jenis === "lama" ? urlFotoBarang(foto.path) : null;
  const labelTombol =
    persen !== null ? `Mengunggah foto ${persen}%` : menyimpan ? "Menyimpan…" : barang ? "Simpan perubahan" : "Simpan barang";

  return (
    <Lembar
      idJudul={`${id}-judul`}
      onTutup={onTutup}
      judul={
        barang ? (
          <>
            <Pencil size={18} className="text-brand-masuk" /> Ubah barang
          </>
        ) : (
          <>
            <PackagePlus size={18} className="text-brand-masuk" /> Tambah barang
          </>
        )
      }
    >
      <input ref={inputKamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pilihFoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={inputGaleri} type="file" accept="image/*" className="hidden" onChange={(e) => { pilihFoto(e.target.files?.[0]); e.target.value = ""; }} />

      {/* Foto */}
      {pratinjau ? (
        <div className="relative overflow-hidden rounded-2xl bg-gray-100">
          <img src={pratinjau} alt="Foto barang" className="aspect-[4/3] w-full object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputGaleri.current?.click()}
              disabled={menyimpan}
              className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-brand-text shadow-sm"
            >
              <ImageIcon size={14} /> Ganti
            </button>
            <button
              type="button"
              onClick={() => setFoto(null)}
              disabled={menyimpan}
              aria-label="Hapus foto"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-sm"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-masuk shadow-sm">
            <Camera size={24} />
          </span>
          <div>
            <p className="text-sm font-bold text-brand-text">Foto barangnya</p>
            <p className="text-xs text-gray-500">Biar gampang dikenali. Satu foto untuk satu jenis barang.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => inputKamera.current?.click()}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-brand-masuk text-sm font-semibold text-white transition active:scale-95"
            >
              <Camera size={16} /> Kamera
            </button>
            <button
              type="button"
              onClick={() => inputGaleri.current?.click()}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text transition active:scale-95"
            >
              <ImageIcon size={16} /> Galeri
            </button>
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-brand-text">Nama barang</span>
        <input
          value={form.nama}
          maxLength={BATAS_INVENTARIS.nama}
          onChange={(e) => ubah("nama", e.target.value)}
          placeholder="mis. Kaos Tugu Jogja ukuran L"
          className="rounded-xl border border-gray-300 p-3 text-base"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-kategori`} className="text-sm font-semibold text-brand-text">
          Kategori <span className="font-normal text-gray-400">(opsional)</span>
        </span>
        <PilihChip
          idLabel={`${id}-kategori`}
          nilai={form.kategori}
          onUbah={(v) => ubah("kategori", v)}
          pilihan={pilihanKategori}
          bolehKosong
          maks={BATAS_INVENTARIS.kategori}
          placeholder="Ketik kategori baru"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-satuan`} className="text-sm font-semibold text-brand-text">
          Satuan
        </span>
        <PilihChip
          idLabel={`${id}-satuan`}
          nilai={form.satuan}
          onUbah={(v) => ubah("satuan", v)}
          pilihan={SATUAN_SARAN}
          bolehKosong={false}
          maks={BATAS_INVENTARIS.satuan}
          placeholder="mis. gulung, rim"
        />
      </div>

      {!barang && (
        <div className="flex flex-col gap-1.5">
          <span id={`${id}-awal`} className="text-sm font-semibold text-brand-text">
            Stok sekarang <span className="font-normal text-gray-400">(boleh 0, nanti dicatat masuk)</span>
          </span>
          <PenghitungJumlah idLabel={`${id}-awal`} nilai={form.stokAwal} onUbah={(n) => ubah("stokAwal", n)} satuan={form.satuan.trim() || "pcs"} cepat={[1, 10, 50, 100]} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-min`} className="text-sm font-semibold text-brand-text">
          Ingatkan kalau stok tinggal
        </span>
        <PenghitungJumlah idLabel={`${id}-min`} nilai={form.stokMinimum} onUbah={(n) => ubah("stokMinimum", n)} satuan={form.satuan.trim() || "pcs"} cepat={[5, 10, 20]} />
        <p className="text-[11px] text-gray-500">
          {form.stokMinimum > 0 ? `Barang diberi tanda "Menipis" saat stok ≤ ${form.stokMinimum}.` : "0 = tidak diingatkan (hanya ditandai saat habis)."}
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-brand-text">
          Keterangan <span className="font-normal text-gray-400">(opsional)</span>
        </span>
        <textarea
          value={form.keterangan}
          maxLength={BATAS_INVENTARIS.keterangan}
          onChange={(e) => ubah("keterangan", e.target.value)}
          rows={3}
          placeholder="mis. disimpan di lemari promosi rak 2, warna maroon"
          className="resize-none rounded-xl border border-gray-300 p-3 text-base"
        />
      </label>

      {galat && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {galat}
        </p>
      )}

      <button
        type="button"
        onClick={() => void simpan()}
        disabled={menyimpan}
        className="relative min-h-[48px] overflow-hidden rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-80"
      >
        {persen !== null && <span className="absolute inset-y-0 left-0 bg-white/20 transition-[width]" style={{ width: `${persen}%` }} aria-hidden="true" />}
        <span className="relative">{labelTombol}</span>
      </button>
    </Lembar>
  );
}
