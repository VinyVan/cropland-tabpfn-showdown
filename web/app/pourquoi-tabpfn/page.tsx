"use client";

import { Nav, useLang } from "../../components/ui";
import { dict, tr } from "../../lib/i18n";
import { lbScores } from "../../lib/lb";

export default function PourquoiTabPFN() {
  const [lang, setLang] = useLang();
  const tabpfn = lbScores.ours.find((e) => e.model === "tabpfn");
  const cards = [
    { t: dict.why.noTuning, b: dict.why.noTuningBody },
    { t: dict.why.onePass, b: dict.why.onePassBody },
    { t: dict.why.speed, b: dict.why.speedBody },
  ];
  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.why.title)}</h1>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">{tr(lang, dict.lb.title)}</h2>
        <p className="mt-2 text-sm leading-relaxed">
          {lang === "fr"
            ? `TabPFN-3.5 est notre meilleur score public Zindi : ${tabpfn?.public_score.toFixed(4)} (privé ${tabpfn?.private_score.toFixed(4)}), devant LightGBM seul, CatBoost seul, XGBoost seul et l'ensemble gagnant — sans tuning ni feature engineering.`
            : `TabPFN-3.5 is our best public Zindi score: ${tabpfn?.public_score.toFixed(4)} (private ${tabpfn?.private_score.toFixed(4)}), ahead of single LightGBM, CatBoost, XGBoost and the winner ensemble — with no tuning and no feature engineering.`}
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>{tr(lang, dict.lb.model)}</th>
              <th className="text-right">{tr(lang, dict.lb.public)}</th>
              <th className="text-right">{tr(lang, dict.lb.private)}</th>
            </tr>
          </thead>
          <tbody>
            {lbScores.ours.map((e) => (
              <tr
                key={e.model}
                className={e.model === "tabpfn" ? "border-t font-bold" : "border-t"}
              >
                <td className="py-1 font-mono">{e.model}</td>
                <td className="py-1 text-right font-mono">
                  {e.public_score.toFixed(4)}
                </td>
                <td className="py-1 text-right font-mono">
                  {e.private_score.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {cards.map((c, i) => (
        <section key={i} className="card mt-4">
          <h2 className="text-xl font-semibold">{tr(lang, c.t)}</h2>
          <p className="mt-2 text-sm leading-relaxed">{tr(lang, c.b)}</p>
        </section>
      ))}
      <section className="card mt-4">
        <h2 className="text-xl font-semibold">{tr(lang, dict.why.limits)}</h2>
        <p className="mt-2 text-sm leading-relaxed">{tr(lang, dict.why.limitsBody)}</p>
      </section>
    </>
  );
}
