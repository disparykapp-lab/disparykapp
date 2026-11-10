import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { ambilTanya, formatWaktu, kirimTanya, type TanyaTugas } from "../lib/tugas";

/**
 * Percakapan tanya-jawab satu tugas antara satu pegawai dan admin (migrasi 0041).
 * Dipakai pegawai (percakapannya sendiri) dan admin (per pegawai di rincian progres).
 */
export default function TanyaJawabTugas({
  tugasId,
  pemilik,
  saya,
  namaPengirim,
  awal,
  onTerkirim,
}: {
  tugasId: string;
  /** pegawai pemilik percakapan */
  pemilik: string;
  saya: string;
  namaPengirim: (id: string | null) => string;
  /** pesan yang sudah dimuat induk (admin); kalau tidak ada, dimuat sendiri */
  awal?: TanyaTugas[];
  onTerkirim?: () => void;
}) {
  const [pesan, setPesan] = useState<TanyaTugas[]>(awal ?? []);
  const [isi, setIsi] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function muat() {
    try {
      setPesan(await ambilTanya(tugasId, pemilik));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat percakapan.");
    }
  }

  useEffect(() => {
    if (awal) return;
    let batal = false;
    ambilTanya(tugasId, pemilik)
      .then((d) => !batal && setPesan(d))
      .catch((e: unknown) => !batal && setGalat(e instanceof Error ? e.message : "Gagal memuat percakapan."));
    return () => {
      batal = true;
    };
  }, [tugasId, pemilik, awal]);

  async function kirim() {
    if (!isi.trim()) return;
    setMengirim(true);
    setGalat(null);
    try {
      await kirimTanya(tugasId, pemilik, isi);
      setIsi("");
      await muat();
      onTerkirim?.();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pesan gagal dikirim.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {pesan.length === 0 ? (
        <p className="text-xs text-gray-400">{pemilik === saya ? "Belum ada pertanyaan. Tanyakan hal yang kurang jelas ke admin di sini." : "Belum ada percakapan."}</p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {pesan.map((m) => {
            const milikSaya = m.pengirim_id === saya;
            return (
              <li key={m.id} className={`flex flex-col ${milikSaya ? "items-end" : "items-start"}`}>
                <span
                  className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3 py-2 text-sm ${
                    milikSaya ? "rounded-br-sm bg-brand-masuk text-white" : "rounded-bl-sm bg-gray-100 text-brand-text"
                  }`}
                >
                  {m.isi}
                </span>
                <span className="mt-0.5 text-[10px] text-gray-400">
                  {milikSaya ? "Kamu" : namaPengirim(m.pengirim_id)} · {formatWaktu(m.dibuat_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          rows={1}
          maxLength={1000}
          placeholder={pemilik === saya ? "Tulis pertanyaan…" : "Tulis jawaban…"}
          aria-label={pemilik === saya ? "Pertanyaan untuk admin" : "Jawaban untuk pegawai"}
          className="min-h-[44px] min-w-0 flex-1 resize-y rounded-lg border border-gray-300 p-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void kirim()}
          disabled={mengirim || !isi.trim()}
          aria-label="Kirim"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-masuk text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
    </div>
  );
}
