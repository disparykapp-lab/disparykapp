import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../../../components/Loading";
import { ASET } from "../assets";
import { gabungRoom } from "../api";
import { useRoom } from "../useRoom";
import { Kepala } from "./bersama";
import LayarMain from "./LayarMain";
import Podium from "./Podium";
import RuangTunggu from "./RuangTunggu";

export default function HalamanRoom() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const s = useRoom(roomId);
  const [bergabung, setBergabung] = useState(false);

  const linkRoom = s.room ? `${window.location.origin}/game/gabung/${s.room.kode}` : undefined;

  async function keluar() {
    if (s.room && s.room.status !== "menunggu" && s.room.status !== "selesai") {
      if (!window.confirm("Keluar dari permainan yang sedang berjalan?")) return;
    }
    await s.keluar();
    navigate("/game", { replace: true });
  }

  // menutup tab/aplikasi tanpa menekan Keluar: tidak apa-apa, server menganggap
  // pemain offline setelah ~40 dtk tanpa detak dan permainan tetap jalan.
  useEffect(() => {
    if (s.ditutup) {
      const t = window.setTimeout(() => navigate("/game", { replace: true }), 2500);
      return () => window.clearTimeout(t);
    }
  }, [s.ditutup, navigate]);

  if (s.ditutup) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <img src={ASET.wajah.kalah} alt="" className="h-32 w-auto" />
        <p className="ct-judul text-xl">Room sudah ditutup</p>
        <p className="text-sm text-slate-500">Kembali ke lobi…</p>
      </div>
    );
  }

  if (s.memuat || !s.room) return <Loading teks="Masuk ke room..." />;

  // membuka link room yang belum diikuti (mis. dari daftar riwayat browser)
  if (!s.sayaAnggota) {
    return (
      <div className="flex flex-col gap-4">
        <Kepala onKeluar={() => navigate("/game")} />
        <div className="ct-kartu flex flex-col items-center gap-3 p-6 text-center">
          <img src={ASET.maskot.menunjuk} alt="" className="h-28 w-auto" />
          <p className="font-semibold">Kamu belum bergabung di room ini.</p>
          {s.error && <p className="text-sm text-red-600">{s.error}</p>}
          <button
            type="button"
            disabled={bergabung}
            onClick={async () => {
              setBergabung(true);
              try {
                await gabungRoom(s.room!.kode);
                await s.muatUlang();
              } catch (e) {
                s.setError(e instanceof Error ? e.message : "Gagal bergabung.");
              } finally {
                setBergabung(false);
              }
            }}
            className="ct-tombol ct-tombol-hijau"
          >
            {bergabung ? "..." : "Gabung"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Kepala onKeluar={() => void keluar()} linkBagikan={linkRoom} />
      {s.room.status === "menunggu" && <RuangTunggu s={s} linkRoom={linkRoom ?? ""} />}
      {(s.room.status === "memilih" || s.room.status === "menggambar" || s.room.status === "reveal") && <LayarMain s={s} />}
      {s.room.status === "selesai" && <Podium s={s} onKeluar={() => void keluar()} />}
      {s.room.status === "menunggu" && s.error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{s.error}</p>}
    </div>
  );
}
