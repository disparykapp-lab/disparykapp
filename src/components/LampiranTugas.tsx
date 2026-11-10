import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Eye, FileText, ImageIcon, Link2, LoaderCircle, Music, Paperclip, X } from "lucide-react";
import { unggahLampiran, urlLampiran, urlUnduhLampiran } from "../lib/tugas";
import PratinjauDocx from "./PratinjauDocx";
import {
  MAKS_LAMPIRAN,
  MAKS_UKURAN_FILE,
  TERIMA_AUDIO,
  TERIMA_FILE,
  TERIMA_GAMBAR,
  cekFileLampiran,
  formatUkuran,
  judulLink,
  perluKompres,
  rapikanLink,
  tipeKonten,
  type Lampiran,
} from "../lib/tugasLampiranMeta";

interface Antrian {
  id: number;
  nama: string;
  tahap: "kompres" | "unggah";
  persen: number;
}

/**
 * Isian lampiran tugas — hasil kerja pegawai atau materi dari pemberi tugas:
 * file, gambar (dikompres dulu), lagu, link. File langsung diunggah begitu
 * dipilih (dengan progres); daftarnya baru tersimpan saat form induk disimpan.
 */
export function InputLampiran({
  folder,
  label,
  nilai,
  onUbah,
  onSibuk,
  onUnggahBaru,
  onHapus,
}: {
  /** folderLampiranPegawai / folderLampiranMateri */
  folder: string;
  label: string;
  nilai: Lampiran[];
  onUbah: (lampiran: Lampiran[]) => void;
  onSibuk: (sibuk: boolean) => void;
  /** path file yang baru diunggah di form ini (belum tersimpan) */
  onUnggahBaru: (path: string) => void;
  onHapus: (l: Lampiran) => void;
}) {
  const [antrian, setAntrian] = useState<Antrian[]>([]);
  const [galat, setGalat] = useState<string[]>([]);
  const [isiLink, setIsiLink] = useState<string | null>(null);
  const terkini = useRef(nilai);
  useEffect(() => {
    terkini.current = nilai;
  });
  const nomor = useRef(0);
  const input = {
    file: useRef<HTMLInputElement>(null),
    gambar: useRef<HTMLInputElement>(null),
    audio: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    onSibuk(antrian.length > 0);
  }, [antrian.length, onSibuk]);

  async function pilih(daftar: FileList | null) {
    if (!daftar || daftar.length === 0) return;
    const pesan: string[] = [];
    const lolos: File[] = [];
    for (const f of Array.from(daftar)) {
      const tipe = tipeKonten(f.name);
      // gambar yang akan dikompres boleh besar dulu; ukurannya dicek lagi setelah kompres
      const cek = cekFileLampiran(f.name, tipe && perluKompres(tipe) ? 0 : f.size, terkini.current.length + antrian.length + lolos.length);
      if (cek) pesan.push(cek);
      else lolos.push(f);
    }
    setGalat(pesan);
    for (const f of lolos) {
      const id = ++nomor.current;
      setAntrian((a) => [...a, { id, nama: f.name, tahap: "unggah", persen: 0 }]);
      const ubahItem = (x: Partial<Antrian>) => setAntrian((a) => a.map((it) => (it.id === id ? { ...it, ...x } : it)));
      try {
        const l = await unggahLampiran(folder, f, (persen) => ubahItem({ tahap: "unggah", persen }), () => ubahItem({ tahap: "kompres" }));
        onUnggahBaru(l.path!);
        onUbah([...terkini.current, l]);
        terkini.current = [...terkini.current, l];
      } catch (e) {
        setGalat((g) => [...g, `${f.name}: ${e instanceof Error ? e.message : "gagal diunggah."}`]);
      } finally {
        setAntrian((a) => a.filter((it) => it.id !== id));
      }
    }
  }

  function tambahLink() {
    const url = rapikanLink(isiLink ?? "");
    if (!url) {
      setGalat(["Link tidak valid. Contoh: https://drive.google.com/…"]);
      return;
    }
    if (nilai.length >= MAKS_LAMPIRAN) {
      setGalat([`Maksimal ${MAKS_LAMPIRAN} lampiran per tugas.`]);
      return;
    }
    setGalat([]);
    onUbah([...nilai, { jenis: "link", nama: judulLink(url), url }]);
    setIsiLink(null);
  }

  const penuh = nilai.length + antrian.length >= MAKS_LAMPIRAN;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-500">{label}</span>

      <DaftarLampiran lampiran={nilai} onHapus={onHapus} />

      {antrian.map((a) => (
        <div key={a.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-brand-masuk" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{a.nama}</span>
          <span className="shrink-0 font-semibold">{a.tahap === "kompres" ? "Mengompres…" : `${a.persen}%`}</span>
        </div>
      ))}

      <div className="grid grid-cols-4 gap-2">
        <TombolJenis ikon={<Paperclip className="h-4 w-4" />} label="File" disabled={penuh} onKlik={() => input.file.current?.click()} />
        <TombolJenis ikon={<ImageIcon className="h-4 w-4" />} label="Gambar" disabled={penuh} onKlik={() => input.gambar.current?.click()} />
        <TombolJenis ikon={<Music className="h-4 w-4" />} label="Lagu" disabled={penuh} onKlik={() => input.audio.current?.click()} />
        <TombolJenis ikon={<Link2 className="h-4 w-4" />} label="Link" disabled={penuh} onKlik={() => setIsiLink(isiLink === null ? "" : null)} />
      </div>
      {(["file", "gambar", "audio"] as const).map((j) => (
        <input
          key={j}
          ref={input[j]}
          type="file"
          multiple
          accept={j === "file" ? TERIMA_FILE : j === "gambar" ? TERIMA_GAMBAR : TERIMA_AUDIO}
          className="hidden"
          onChange={(e) => {
            void pilih(e.target.files);
            e.target.value = "";
          }}
        />
      ))}

      {isiLink !== null && (
        <div className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            autoFocus
            value={isiLink}
            onChange={(e) => setIsiLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tambahLink();
              }
            }}
            placeholder="https://drive.google.com/…"
            aria-label="Alamat link"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 p-2 text-sm"
          />
          <button type="button" onClick={tambahLink} className="shrink-0 rounded-lg bg-brand-masuk px-3 text-xs font-semibold text-white">
            Tambah
          </button>
        </div>
      )}

      {galat.map((g, i) => (
        <p key={i} className="text-xs text-red-600">
          {g}
        </p>
      ))}
      <p className="text-[11px] text-gray-400">
        Maks. {MAKS_LAMPIRAN} lampiran, {formatUkuran(MAKS_UKURAN_FILE)} per file. Gambar otomatis dikompres. File yang lebih besar kirim lewat link.
      </p>
    </div>
  );
}

function TombolJenis({ ikon, label, disabled, onKlik }: { ikon: ReactNode; label: string; disabled: boolean; onKlik: () => void }) {
  return (
    <button
      type="button"
      onClick={onKlik}
      disabled={disabled}
      className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg border border-gray-300 bg-white text-[11px] font-semibold text-gray-600 disabled:opacity-40"
    >
      {ikon}
      {label}
    </button>
  );
}

/** .docx bisa dibaca langsung di aplikasi (lib/docx); file lain dibuka/diunduh. */
const bisaDilihat = (l: Lampiran) => l.jenis === "file" && !!l.path && /\.docx$/i.test(l.nama);

/**
 * Daftar lampiran: gambar sebagai thumbnail, lagu bisa diputar, .docx dibaca di
 * aplikasi, file & link dibuka di tab baru. File privat dibuka lewat signed URL
 * (1 jam); tombol Unduh membuat link baru dengan nama file asli setiap ditekan.
 */
export function DaftarLampiran({ lampiran, onHapus }: { lampiran: Lampiran[] | undefined; onHapus?: (l: Lampiran) => void }) {
  const daftar = lampiran ?? [];
  const kunci = daftar.flatMap((l) => (l.path ? [l.path] : [])).join("|");
  const [url, setUrl] = useState<Record<string, string>>({});
  const [pratinjau, setPratinjau] = useState<Lampiran | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function unduh(l: Lampiran) {
    setGalat(null);
    try {
      // Content-Disposition: attachment → halaman tidak berpindah, file tersimpan dengan nama aslinya
      window.location.assign(await urlUnduhLampiran(l.path!, l.nama));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "File tidak bisa diunduh.");
    }
  }

  useEffect(() => {
    if (!kunci) return;
    let batal = false;
    urlLampiran(kunci.split("|")).then((u) => !batal && setUrl((lama) => ({ ...lama, ...u })));
    return () => {
      batal = true;
    };
  }, [kunci]);

  if (daftar.length === 0) return null;

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {daftar.map((l, i) => {
          const href = l.jenis === "link" ? l.url : l.path ? url[l.path] : undefined;
          return (
            <li key={`${l.path ?? l.url}-${i}`} className="flex flex-col gap-1.5 rounded-lg border border-gray-100 bg-gray-50 p-2">
              <div className="flex items-center gap-2">
                {l.jenis === "gambar" && href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={href} alt="" className="h-12 w-12 rounded-md object-cover" />
                  </a>
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-brand-masuk" aria-hidden="true">
                    {l.jenis === "link" ? <Link2 className="h-4 w-4" /> : l.jenis === "audio" ? <Music className="h-4 w-4" /> : l.jenis === "gambar" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {bisaDilihat(l) ? (
                    <button type="button" onClick={() => setPratinjau(l)} className="block max-w-full truncate text-left text-xs font-semibold text-brand-info underline-offset-2 hover:underline">
                      {l.nama}
                    </button>
                  ) : href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="block truncate text-xs font-semibold text-brand-info underline-offset-2 hover:underline">
                      {l.nama}
                    </a>
                  ) : (
                    <p className="truncate text-xs font-semibold text-brand-text">{l.nama}</p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    {l.jenis === "link" ? "Link" : l.jenis === "gambar" ? "Gambar" : l.jenis === "audio" ? "Lagu/audio" : "File"}
                    {l.ukuran ? ` · ${formatUkuran(l.ukuran)}` : ""}
                  </p>
                  {l.path && (
                    <div className="mt-1 flex gap-1.5">
                      {bisaDilihat(l) && (
                        <button type="button" onClick={() => setPratinjau(l)} className="flex min-h-[32px] items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-brand-text">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Lihat
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void unduh(l)}
                        aria-label={`Unduh ${l.nama}`}
                        className="flex min-h-[32px] items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-brand-text"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Unduh
                      </button>
                    </div>
                  )}
                </div>
                {onHapus && (
                  <button
                    type="button"
                    onClick={() => onHapus(l)}
                    aria-label={`Hapus lampiran ${l.nama}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {l.jenis === "audio" && href && <audio controls preload="none" src={href} className="h-9 w-full" />}
            </li>
          );
        })}
      </ul>
      {galat && <p className="mt-1 text-xs text-red-600">{galat}</p>}
      {pratinjau?.path && (
        <PratinjauDocx path={pratinjau.path} nama={pratinjau.nama} onUnduh={() => void unduh(pratinjau)} onTutup={() => setPratinjau(null)} />
      )}
    </>
  );
}
