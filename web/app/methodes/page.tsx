"use client";

import { Nav, useLang } from "../../components/ui";
import { dict, tr } from "../../lib/i18n";

export default function Methodes() {
  const [lang, setLang] = useLang();
  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.methods.title)}</h1>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">{tr(lang, dict.methods.winnerTitle)}</h2>
        <p className="mt-2 text-sm leading-relaxed">{tr(lang, dict.methods.winnerBody)}</p>
      </section>

      <section className="card mt-4">
        <h2 className="text-xl font-semibold">{tr(lang, dict.methods.tabpfnTitle)}</h2>
        <p className="mt-2 text-sm leading-relaxed">{tr(lang, dict.methods.tabpfnBody)}</p>
      </section>

      <section className="card mt-4">
        <h2 className="text-xl font-semibold">{tr(lang, dict.methods.simpleTitle)}</h2>
        <p className="mt-2 text-sm leading-relaxed">{tr(lang, dict.methods.simpleBody)}</p>
      </section>

      <section className="card mt-4">
        <h2 className="text-xl font-semibold">{tr(lang, dict.methods.schemaTitle)}</h2>
        <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed">
{`winner:  raw (189) ──▶ intra-fold grid aggs (+36) ──▶ 218 feats ──▶ CB+XGB+LGBM ──▶ mean proba ──▶ seuil 0.5
tabpfn:  raw (189) ──▶ 182 feats bruts ──▶ TabPFN-3.5 (1 passe, no tuning) ──▶ proba ──▶ seuil 0.5
split:   GroupKFold-5 sur grid_id, seed 32 — IDENTIQUE des deux côtés`}
        </pre>
      </section>
    </>
  );
}
