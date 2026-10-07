import { useEffect, useId, useState, type ChangeEvent } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { useAuth } from "../../contexts/AuthContext";
import {
  ambilLanding,
  ambilStatusLanding,
  simpanLanding,
  simpanStatusLanding,
  unggahFotoLanding,
  type LandingTergabung,
} from "../../lib/landing";
import { BAWAAN } from "../../landing/defaults";
import { DAFTAR_IKON } from "../../landing/ikon";
import { SEMUA_KUNCI, type Isi, type KunciLanding } from "../../landing/types";

type Obj = Record<string, unknown>;

type Field =
  | { tipe: "teks" | "area" | "foto" | "tanggal" | "angka" | "csv" | "ikon"; key: string; label: string; hint?: string }
  | { tipe: "daftar"; key: string; label: string; item: Field[]; buatBaru: () => Obj; tambah: string };

const idBaru = (awalan: string) => `${awalan}-${Math.random().toString(36).slice(2, 7)}`;

interface Bagian {
  judul: string;
  /** Bagian inti (navbar, hero, kategori) selalu tampil, tidak bisa disembunyikan. */
  bisaDisembunyikan: boolean;
  fields: Field[];
}

const SKEMA: Record<KunciLanding, Bagian> = {
  navbar: {
    judul: "Navigasi atas",
    bisaDisembunyikan: false,
    fields: [
      { tipe: "teks", key: "logo", label: "Nama logo" },
      {
        tipe: "daftar", key: "menu", label: "Menu", tambah: "+ Tambah menu",
        buatBaru: () => ({ label: "Menu baru", target: "destinasi" }),
        item: [
          { tipe: "teks", key: "label", label: "Teks menu" },
          { tipe: "teks", key: "target", label: "Tujuan", hint: "destinasi, gaya, berita, atau agenda" },
        ],
      },
      { tipe: "teks", key: "tombolMasuk", label: "Tombol masuk" },
      { tipe: "teks", key: "tombolDaftar", label: "Tombol daftar" },
    ],
  },
  hero: {
    judul: "Hero (foto utama)",
    bisaDisembunyikan: false,
    fields: [
      { tipe: "foto", key: "foto", label: "Foto utama", hint: "Disarankan lebar minimal 2000 px." },
      { tipe: "teks", key: "eyebrow", label: "Eyebrow (teks kecil di atas judul)" },
      { tipe: "area", key: "judul", label: "Judul", hint: "Satu baris per kalimat, tekan Enter untuk baris baru." },
      { tipe: "area", key: "subjudul", label: "Subjudul" },
      { tipe: "teks", key: "placeholderCari", label: "Teks kotak pencarian" },
      { tipe: "teks", key: "captionLokasi", label: "Keterangan foto (lokasi)" },
      { tipe: "teks", key: "captionKalimat", label: "Keterangan foto (kalimat)" },
    ],
  },
  kategori: {
    judul: "Bar kategori (di bawah hero)",
    bisaDisembunyikan: false,
    fields: [
      {
        tipe: "daftar", key: "items", label: "Kategori", tambah: "+ Tambah kategori",
        buatBaru: () => ({ id: idBaru("kat"), label: "Kategori baru", icon: "compass" }),
        item: [
          { tipe: "teks", key: "id", label: "ID", hint: "Huruf kecil tanpa spasi. Dipakai destinasi untuk memilih kategori." },
          { tipe: "teks", key: "label", label: "Nama" },
          { tipe: "ikon", key: "icon", label: "Ikon" },
        ],
      },
    ],
  },
  destinasi: {
    judul: "Destinasi populer",
    bisaDisembunyikan: true,
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Subjudul" },
      { tipe: "teks", key: "tautanLabel", label: "Teks tautan" },
      {
        tipe: "daftar", key: "items", label: "Destinasi", tambah: "+ Tambah destinasi",
        buatBaru: () => ({ id: idBaru("dst"), nama: "Destinasi baru", negara: "Yogyakarta", tagline: "", foto: "", tags: [] }),
        item: [
          { tipe: "teks", key: "nama", label: "Nama" },
          { tipe: "teks", key: "negara", label: "Lokasi (kecamatan/kabupaten)" },
          { tipe: "area", key: "tagline", label: "Keterangan singkat" },
          { tipe: "foto", key: "foto", label: "Foto" },
          { tipe: "csv", key: "tags", label: "Kategori", hint: "Pisahkan dengan koma, pakai ID kategori. Contoh: budaya, kota" },
          { tipe: "teks", key: "id", label: "ID (unik)" },
        ],
      },
    ],
  },
  gaya: {
    judul: "Gaya wisata (chip pilihan)",
    bisaDisembunyikan: true,
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Subjudul" },
      {
        tipe: "daftar", key: "items", label: "Chip gaya", tambah: "+ Tambah gaya",
        buatBaru: () => ({ id: idBaru("gaya"), label: "Gaya baru", icon: "compass" }),
        item: [
          { tipe: "teks", key: "id", label: "ID (dipakai paket agenda)" },
          { tipe: "teks", key: "label", label: "Nama" },
          { tipe: "ikon", key: "icon", label: "Ikon" },
        ],
      },
    ],
  },
  paket: {
    judul: "Agenda unggulan",
    bisaDisembunyikan: true,
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Subjudul" },
      { tipe: "teks", key: "tautanLabel", label: "Teks tautan" },
      {
        tipe: "daftar", key: "items", label: "Agenda", tambah: "+ Tambah agenda",
        buatBaru: () => ({ id: idBaru("agd"), judul: "Agenda baru", deskripsi: "", negara: "Yogyakarta", durasi: 1, harga: "Info menyusul", foto: "", gaya: [] }),
        item: [
          { tipe: "teks", key: "judul", label: "Judul agenda" },
          { tipe: "area", key: "deskripsi", label: "Deskripsi" },
          { tipe: "teks", key: "negara", label: "Lokasi" },
          { tipe: "angka", key: "durasi", label: "Durasi (hari)" },
          { tipe: "teks", key: "harga", label: "Harga / keterangan", hint: "Contoh: Gratis, atau Info menyusul" },
          { tipe: "foto", key: "foto", label: "Foto" },
          { tipe: "csv", key: "gaya", label: "Gaya yang cocok", hint: "ID gaya dipisah koma" },
          { tipe: "teks", key: "id", label: "ID (unik)" },
        ],
      },
    ],
  },
  berita: {
    judul: "Berita terkini",
    bisaDisembunyikan: true,
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Subjudul" },
      {
        tipe: "daftar", key: "items", label: "Berita", tambah: "+ Tambah berita",
        buatBaru: () => ({ id: idBaru("brt"), judul: "Judul berita", ringkasan: "", tanggal: new Date().toISOString().slice(0, 10), foto: "", tautan: "" }),
        item: [
          { tipe: "teks", key: "judul", label: "Judul" },
          { tipe: "area", key: "ringkasan", label: "Ringkasan" },
          { tipe: "tanggal", key: "tanggal", label: "Tanggal" },
          { tipe: "foto", key: "foto", label: "Foto" },
          { tipe: "teks", key: "tautan", label: "Tautan (opsional)", hint: "Kosongkan kalau tidak ada tautan." },
          { tipe: "teks", key: "id", label: "ID (unik)" },
        ],
      },
    ],
  },
  testimoni: {
    judul: "Testimoni pengunjung",
    bisaDisembunyikan: true,
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Subjudul" },
      {
        tipe: "daftar", key: "items", label: "Testimoni", tambah: "+ Tambah testimoni",
        buatBaru: () => ({ id: idBaru("tst"), nama: "Nama", asal: "Asal destinasi", kutipan: "", foto: "" }),
        item: [
          { tipe: "teks", key: "nama", label: "Nama" },
          { tipe: "teks", key: "asal", label: "Berkunjung ke" },
          { tipe: "area", key: "kutipan", label: "Kutipan" },
          { tipe: "foto", key: "foto", label: "Foto (opsional)" },
          { tipe: "teks", key: "id", label: "ID (unik)" },
        ],
      },
    ],
  },
  newsletter: {
    judul: "Newsletter",
    bisaDisembunyikan: true,
    fields: [
      { tipe: "foto", key: "foto", label: "Foto pita (kiri)" },
      { tipe: "teks", key: "eyebrow", label: "Eyebrow" },
      { tipe: "teks", key: "judul", label: "Judul" },
      { tipe: "area", key: "teks", label: "Teks" },
      { tipe: "teks", key: "placeholder", label: "Teks kolom email" },
      { tipe: "teks", key: "tombol", label: "Tombol" },
      { tipe: "area", key: "catatanPrivasi", label: "Catatan privasi" },
    ],
  },
  footer: {
    judul: "Footer",
    bisaDisembunyikan: true,
    fields: [
      { tipe: "area", key: "tagline", label: "Tagline" },
      { tipe: "teks", key: "hak", label: "Teks hak cipta (setelah tahun)" },
      {
        tipe: "daftar", key: "kolom", label: "Kolom tautan", tambah: "+ Tambah kolom",
        buatBaru: () => ({ judul: "Kolom baru", tautan: [] }),
        item: [
          { tipe: "teks", key: "judul", label: "Judul kolom" },
          { tipe: "csv", key: "tautan", label: "Tautan", hint: "Dipisah koma" },
        ],
      },
      {
        tipe: "daftar", key: "sosial", label: "Media sosial", tambah: "+ Tambah akun",
        buatBaru: () => ({ nama: "Instagram", url: "" }),
        item: [
          { tipe: "teks", key: "nama", label: "Nama (mis. Instagram)" },
          { tipe: "teks", key: "url", label: "Tautan profil", hint: "Dikosongkan = tidak ditampilkan." },
        ],
      },
    ],
  },
};

interface Draf {
  isi: Obj;
  tampil: boolean;
}

export default function KelolaLanding() {
  const { profile } = useAuth();
  const [data, setData] = useState<LandingTergabung | null>(null);
  const [draf, setDraf] = useState<Record<string, Draf>>({});
  const [terbuka, setTerbuka] = useState<KunciLanding | null>(null);
  const [status, setStatus] = useState<{ kunci: string; pesan: string; galat: boolean } | null>(null);
  const [menyimpan, setMenyimpan] = useState<string | null>(null);
  const [aktif, setAktif] = useState<boolean | null>(null);
  const [statusAktif, setStatusAktif] = useState<string | null>(null);

  useEffect(() => {
    ambilStatusLanding().then(setAktif);
  }, []);

  useEffect(() => {
    ambilLanding().then((d) => {
      setData(d);
      const awal: Record<string, Draf> = {};
      for (const k of SEMUA_KUNCI) {
        awal[k] = { isi: d[k].isi as unknown as Obj, tampil: d[k].tampil };
      }
      setDraf(awal);
    });
  }, []);

  if (!data) return <Loading teks="Memuat landing page..." />;

  function ubahIsi(k: KunciLanding, isiBaru: Obj) {
    setDraf((d) => ({ ...d, [k]: { ...d[k], isi: isiBaru } }));
  }

  function ubahTampil(k: KunciLanding, tampil: boolean) {
    setDraf((d) => ({ ...d, [k]: { ...d[k], tampil } }));
  }

  function kembalikanBawaan(k: KunciLanding) {
    setDraf((d) => ({ ...d, [k]: { ...d[k], isi: BAWAAN[k] as unknown as Obj } }));
    setStatus({ kunci: k, pesan: "Isi bawaan dimuat. Tekan Simpan untuk menerapkannya.", galat: false });
  }

  async function simpan(k: KunciLanding) {
    if (!profile) return;
    setMenyimpan(k);
    setStatus(null);
    try {
      await simpanLanding(k, draf[k].isi as unknown as Isi[KunciLanding], draf[k].tampil, profile.id);
      setStatus({ kunci: k, pesan: "Tersimpan. Landing page sudah diperbarui.", galat: false });
    } catch (e) {
      setStatus({ kunci: k, pesan: e instanceof Error ? e.message : "Gagal menyimpan.", galat: true });
    } finally {
      setMenyimpan(null);
    }
  }

  async function ubahAktif(nilai: boolean) {
    if (!profile) return;
    setStatusAktif(null);
    try {
      await simpanStatusLanding(nilai, profile.id);
      setAktif(nilai);
      setStatusAktif(nilai ? "Landing dinyalakan. Pengunjung bisa melihatnya." : "Landing dimatikan. Pengunjung langsung diarahkan ke login.");
    } catch (e) {
      setStatusAktif(e instanceof Error ? e.message : "Gagal mengubah status.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Landing Page" kembaliKe="/kelola" />

      <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <p className="font-semibold text-brand-text">Landing page: {aktif === null ? "..." : aktif ? "Aktif" : "Nonaktif"}</p>
          <p className="text-xs text-gray-500">
            {aktif === false
              ? "Alamat utama langsung ke halaman login."
              : "Alamat utama menampilkan landing page untuk pengunjung."}
          </p>
          {statusAktif && <p className="mt-1 text-xs text-gray-600">{statusAktif}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aktif === true}
          disabled={aktif === null}
          onClick={() => void ubahAktif(!aktif)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${aktif ? "bg-brand-masuk" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${aktif ? "left-[22px]" : "left-0.5"}`}
          />
          <span className="sr-only">Nyalakan atau matikan landing page</span>
        </button>
      </div>

      <div className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm">
        Ini isi halaman depan yang dilihat pengunjung di alamat utama aplikasi. Ubah lalu tekan{" "}
        <strong>Simpan</strong> di tiap bagian. Bagian yang dimatikan tidak tampil untuk pengunjung.
      </div>

      {SEMUA_KUNCI.map((k) => {
        const bagian = SKEMA[k];
        const buka = terbuka === k;
        const d = draf[k];
        if (!d) return null;
        return (
          <section key={k} className="rounded-xl bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setTerbuka(buka ? null : k)}
              aria-expanded={buka}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <span>
                <span className="font-semibold text-brand-text">{bagian.judul}</span>
                {bagian.bisaDisembunyikan && !d.tampil && (
                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                    disembunyikan
                  </span>
                )}
              </span>
              <span className="text-gray-400">{buka ? "▲" : "▼"}</span>
            </button>

            {buka && (
              <div className="flex flex-col gap-4 border-t border-gray-100 p-4">
                {bagian.bisaDisembunyikan && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={d.tampil} onChange={(e) => ubahTampil(k, e.target.checked)} />
                    Tampilkan bagian ini di landing
                  </label>
                )}

                <FieldList fields={bagian.fields} nilai={d.isi} kunci={k} onUbah={(n) => ubahIsi(k, n)} />

                {status?.kunci === k && (
                  <p className={`text-sm ${status.galat ? "text-red-600" : "text-green-700"}`}>{status.pesan}</p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => kembalikanBawaan(k)}
                    className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-brand-text"
                  >
                    Kembalikan isi bawaan
                  </button>
                  <button
                    type="button"
                    onClick={() => void simpan(k)}
                    disabled={menyimpan === k}
                    className="min-h-[44px] flex-1 rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {menyimpan === k ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function FieldList({ fields, nilai, kunci, onUbah }: { fields: Field[]; nilai: Obj; kunci: string; onUbah: (n: Obj) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((f) => (
        <FieldView key={f.key} field={f} nilai={nilai} kunci={kunci} onUbah={onUbah} />
      ))}
    </div>
  );
}

function FieldView({ field, nilai, kunci, onUbah }: { field: Field; nilai: Obj; kunci: string; onUbah: (n: Obj) => void }) {
  const nilaiField = nilai[field.key];
  const set = (v: unknown) => onUbah({ ...nilai, [field.key]: v });
  const id = useId();

  if (field.tipe === "daftar") {
    const daftar = (Array.isArray(nilaiField) ? nilaiField : []) as Obj[];
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-700">{field.label}</p>
        {daftar.map((item, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <FieldList
              fields={field.item}
              nilai={item}
              kunci={kunci}
              onUbah={(n) => set(daftar.map((x, j) => (j === i ? n : x)))}
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" disabled={i === 0} onClick={() => set(tukar(daftar, i, i - 1))} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">
                ↑ Naik
              </button>
              <button type="button" disabled={i === daftar.length - 1} onClick={() => set(tukar(daftar, i, i + 1))} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">
                ↓ Turun
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Hapus item ini dari landing?")) set(daftar.filter((_, j) => j !== i));
                }}
                className="ml-auto rounded-md border border-red-200 bg-white px-3 py-1.5 text-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set([...daftar, field.buatBaru()])} className="min-h-[40px] rounded-lg border border-dashed border-brand-masuk text-sm font-semibold text-brand-masuk">
          {field.tambah}
        </button>
      </div>
    );
  }

  if (field.tipe === "foto") {
    return <FotoField label={field.label} hint={field.hint} url={String(nilaiField ?? "")} kunci={kunci} onUbah={set} />;
  }

  const hint = field.hint && <span className="mt-0.5 block text-xs text-gray-400">{field.hint}</span>;
  const label = (
    <label htmlFor={id} className="mb-1 block text-sm font-semibold text-gray-700">
      {field.label}
      {hint}
    </label>
  );
  const kelas = "w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm";

  if (field.tipe === "area") {
    return (
      <div>
        {label}
        <textarea id={id} rows={3} value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelas} />
      </div>
    );
  }
  if (field.tipe === "csv") {
    const arr = Array.isArray(nilaiField) ? (nilaiField as string[]) : [];
    return (
      <div>
        {label}
        <input id={id} type="text" value={arr.join(", ")} onChange={(e) => set(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} className={kelas} />
      </div>
    );
  }
  if (field.tipe === "ikon") {
    return (
      <div>
        {label}
        <select id={id} value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelas}>
          {DAFTAR_IKON.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.tipe === "angka") {
    return (
      <div>
        {label}
        <input id={id} type="number" min={1} value={Number(nilaiField ?? 1)} onChange={(e) => set(Number(e.target.value) || 1)} className={kelas} />
      </div>
    );
  }
  if (field.tipe === "tanggal") {
    return (
      <div>
        {label}
        <input id={id} type="date" value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelas} />
      </div>
    );
  }
  return (
    <div>
      {label}
      <input id={id} type="text" value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelas} />
    </div>
  );
}

function tukar<T>(arr: T[], a: number, b: number): T[] {
  const hasil = [...arr];
  [hasil[a], hasil[b]] = [hasil[b], hasil[a]];
  return hasil;
}

function FotoField({
  label,
  hint,
  url,
  kunci,
  onUbah,
}: {
  label: string;
  hint?: string;
  url: string;
  kunci: string;
  onUbah: (v: string) => void;
}) {
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function unggah(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setGalat("File harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    setMemuat(true);
    setGalat(null);
    try {
      onUbah(await unggahFotoLanding(file, kunci));
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-gray-700">
        {label}
        {hint && <span className="mt-0.5 block text-xs font-normal text-gray-400">{hint}</span>}
      </p>
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-linear-to-br from-blue-100 to-blue-400">
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-brand-text">
            {memuat ? "Mengunggah..." : url ? "Ganti foto" : "Unggah foto"}
            <input type="file" accept="image/*" onChange={unggah} disabled={memuat} className="sr-only" />
          </label>
          {url && (
            <button type="button" onClick={() => onUbah("")} className="text-left text-xs text-red-600">
              Hapus foto
            </button>
          )}
        </div>
      </div>
      {galat && <p className="mt-1 text-xs text-red-600">{galat}</p>}
    </div>
  );
}
