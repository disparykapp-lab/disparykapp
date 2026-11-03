import type { ReactNode } from "react";
import { latar, type NamaBgm, type NamaLatar } from "../aset";
import { useBgm } from "../audio";

/** Satu layar penuh: background SVG beranimasi + musik latar layar itu. */
export default function Layar({ bg, bgm, children }: { bg: NamaLatar; bgm: NamaBgm | null; children: ReactNode }) {
  useBgm(bgm);
  return (
    <section className="sp-screen sp-anim-fade-in">
      <img className="sp-bg" src={latar(bg)} alt="" />
      {children}
    </section>
  );
}
