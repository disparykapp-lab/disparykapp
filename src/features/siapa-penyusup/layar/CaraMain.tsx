import { useNavigate } from "react-router-dom";
import { ikon } from "../aset";
import Layar from "../komponen/Layar";
import { TombolKembali, TombolSuara } from "../komponen/bersama";
import { MAKS_PEMAIN, MIN_PEMAIN } from "../logika";

export default function CaraMain() {
  const navigate = useNavigate();
  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        <TombolKembali onClick={() => navigate("/siapa-penyusup")} />
        <TombolSuara />
      </div>
      <div className="sp-panel sp-anim-slide-up">
        <h2 className="sp-panel__title">
          <img src={ikon("bantuan")} width={30} alt="" />
          Cara Main
        </h2>
        <ol className="sp-aturan">
          <li>
            Semua pemain dapat <b>kata rahasia</b>. Satu (atau dua) orang adalah <b>Penyusup</b> dengan kata yang{" "}
            <i>mirip tapi beda</i>.
          </li>
          <li>Tahan kartu untuk melihat katamu. Jangan tunjukkan ke orang lain!</li>
          <li>
            Bergiliran, beri <b>1 kata petunjuk</b> tentang katamu. Jangan terlalu jelas, dan jangan sebut katamu sendiri.
          </li>
          <li>
            <b>Diskusi</b>: siapa yang petunjuknya janggal?
          </li>
          <li>
            <b>Voting</b>: pilih yang kamu curigai. Suara terbanyak tersingkir. Kalau seri, tidak ada yang tersingkir.
          </li>
          <li>
            Pemandu menang kalau semua penyusup tertangkap. Penyusup menang kalau jumlahnya sama dengan pemandu yang tersisa,
            atau masih bertahan setelah 6 ronde.
          </li>
        </ol>
        <p className="sp-muted">
          {MIN_PEMAIN}–{MAKS_PEMAIN} pemain.
        </p>
        <div className="sp-info-mode">
          <img src={ikon("divisi")} alt="" />
          <span className="sp-muted">
            <b>Satu Divisi</b>: hanya teman satu divisi yang bisa gabung.
          </span>
        </div>
        <div className="sp-info-mode">
          <img src={ikon("antar_divisi")} alt="" />
          <span className="sp-muted">
            <b>Antar Divisi</b>: semua divisi boleh gabung, poin dikumpulkan per divisi.
          </span>
        </div>
      </div>
    </Layar>
  );
}
