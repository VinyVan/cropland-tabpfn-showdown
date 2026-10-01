"use client";

import { Nav, useLang } from "../../components/ui";
import { dict, tr } from "../../lib/i18n";

export default function PourquoiTabPFN() {
  const [lang, setLang] = useLang();
  const cards = [
    { t: dict.why.noTuning, b: dict.why.noTuningBody },
    { t: dict.why.onePass, b: dict.why.onePassBody },
    { t: dict.why.speed, b: dict.why.speedBody },
  ];
  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.why.title)}</h1>
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
