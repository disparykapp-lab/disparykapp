import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { ambilDivisi, ambilPapanSkor, type DivisiRingkas, type PapanSkor as DataPapanSkor } from "../api";
import { ikon } from "../aset";
import { sfx } from "../audio";
import DaftarPeringkat from "../komponen/DaftarPeringkat";
import Layar from "../komponen/Layar";
import { TombolKembali, TombolSuara } from "../komponen/bersama";
import { nomorWarnaDivisi } from "../logika";

type Rentang = "minggu" | "semua";
type Tab = "divisi" | "pemain";

/** Tombol segmen (.sp-tab) untuk memilih rentang / jenis papan skor. */
function Pilihan<T extends string>({ nilai, pilihan, onPilih, label }: { nilai: T; pilihan: [T, string][]; onPilih: (v: T) => void; label: string }) {
  return (
    <div className="sp-tab" role="tablist" aria-label={label}>
      {pilihan.map(([v, teks]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={nilai === v}
          className={`sp-btn sp-btn--sm ${nilai === v ? "" : "sp-btn--light"}`}
          onClick={() => {
            sfx("sfx_pop");
            onPilih(v);
          }}
        >
          {teks}
        </button>
      ))}
    </div>
  );
}

/** Papan skor dari menu: minggu ini (Senin–Minggu WIB) atau sepanjang waktu. */
export default function PapanSkor() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [rentang, setRentang] = useState<Rentang>("minggu");
  const [tab, setTab] = useState<Tab>("divisi");
  const [data, setData] = useState<{ rentang: Rentang; isi: DataPapanSkor } | null>(null);
  const [divisi, setDivisi] = useState<DivisiRingkas[]>([]);

  useEffect(() => {
    ambilDivisi().then(setDivisi).catch(() => {});
  }, []);

  useEffect(() => {
    let batal = false;
    ambilPapanSkor(rentang)
      .then((isi) => !batal && setData({ rentang, isi }))
      .catch(() => !batal && setData({ rentang, isi: { per_pemain: [], per_divisi: [] } }));
    return () => {
      batal = true;
    };
  }, [rentang]);

  const urutan = divisi.map((d) => d.id);
  const warna = (id: string | null) => {
    const n = nomorWarnaDivisi(id, urutan);
    return n ? `var(--divisi-${n})` : "var(--gray-400)";
  };
  const namaDivisi = (id: string | null) => divisi.find((d) => d.id === id)?.nama ?? null;
  const memuat = data?.rentang !== rentang;

  const barisDivisi = (data?.isi.per_divisi ?? []).map((d) => ({
    id: d.divisi_id,
    nama: d.nama,
    sub: `${d.pemain} pemain`,
    poin: d.poin,
    warna: warna(d.divisi_id),
  }));
  const barisPemain = (data?.isi.per_pemain ?? []).map((p) => ({
    id: p.user_id,
    nama: `${p.nama}${p.user_id === profile?.id ? " (kamu)" : ""}`,
    sub: `${namaDivisi(p.divisi_id) ?? "Tanpa divisi"} · ${p.main} main · ${p.menang} menang`,
    poin: p.poin,
    warna: warna(p.divisi_id),
  }));

  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        <TombolKembali onClick={() => navigate("/siapa-penyusup")} />
        <h1 className="sp-title">Papan Skor</h1>
        <TombolSuara />
      </div>
      <div className="sp-panel sp-stack sp-anim-slide-up">
        <h2 className="sp-panel__title" style={{ margin: 0 }}>
          <img src={ikon("trofi")} width={30} alt="" />
          {rentang === "minggu" ? "Minggu ini" : "Sepanjang waktu"}
        </h2>
        <Pilihan label="Rentang waktu" nilai={rentang} onPilih={setRentang} pilihan={[["minggu", "Minggu ini"], ["semua", "Semua"]]} />
        <Pilihan label="Jenis papan skor" nilai={tab} onPilih={setTab} pilihan={[["divisi", "Per Divisi"], ["pemain", "Per Pemain"]]} />
        {memuat ? (
          <p className="sp-muted">Memuat…</p>
        ) : tab === "divisi" ? (
          <>
            <DaftarPeringkat key={`d-${rentang}`} baris={barisDivisi} kosong="Belum ada poin divisi. Poin divisi dihitung dari game Antar Divisi." />
            <p className="sp-muted">Poin divisi = jumlah poin anggotanya di game Antar Divisi.</p>
          </>
        ) : (
          <DaftarPeringkat key={`p-${rentang}`} baris={barisPemain} kosong="Belum ada yang bermain." />
        )}
      </div>
    </Layar>
  );
}
