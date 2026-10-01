"use client";

import Link from "next/link";
import { useState } from "react";
import { Nav, useLang, Bar } from "../components/ui";
import { dict, tr } from "../lib/i18n";
import { showdown } from "../lib/showdown";

export default function Home() {
  const [lang, setLang] = useLang();
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);

  const w = showdown.winner.acc;
  const t = showdown.tabpfn.acc;
  const verdict =
    t > w
      ? { fr: `TabPFN-3.5 passe devant (${t} vs ${w} accuracy) — sans tuning ni feature engineering.`, en: `TabPFN-3.5 leads (${t} vs ${w} accuracy) — no tuning, no feature engineering.` }
      : { fr: `Le gagnant garde la tête (${w} vs ${t} accuracy) — TabPFN reste au contact sans tuning.`, en: `The winner stays ahead (${w} vs ${t} accuracy) — TabPFN stays close with no tuning.` };

  async function demoPredict(model: "winner" | "tabpfn") {
    setLoading(model);
    setResult("");
    try {
      const sample = await fetch("/api/py/sample").then((r) => r.json());
      const res = await fetch(`/api/py/predict?model=${model}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sample.row ?? sample),
      }).then((r) => r.json());
      setResult(`${model}: label=${res.label} proba=${res.proba}`);
    } catch (e) {
      setResult(`error: ${String(e)}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.home.title)}</h1>
      <p className="mt-2 opacity-80">{tr(lang, dict.home.subtitle)}</p>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">{tr(lang, dict.home.verdict)}</h2>
        <p className="mt-2">{tr(lang, verdict)}</p>
        <Bar label={`${tr(lang, dict.common.winner)} — accuracy`} value={w} />
        <Bar label={`${tr(lang, dict.common.tabpfn)} — accuracy`} value={t} />
        <div className="mt-4 flex gap-3">
          <Link className="card !p-3 font-medium underline" href="/performances">
            {tr(lang, dict.home.cta_perf)}
          </Link>
          <Link className="card !p-3 font-medium underline" href="/methodes">
            {tr(lang, dict.home.cta_methods)}
          </Link>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">{tr(lang, dict.home.demo)}</h2>
        <div className="mt-3 flex gap-3">
          {(["winner", "tabpfn"] as const).map((m) => (
            <button
              key={m}
              className="card !p-3 border underline"
              onClick={() => demoPredict(m)}
              disabled={loading !== null}
            >
              {loading === m ? "…" : `${tr(lang, dict.home.predict)} — ${m}`}
            </button>
          ))}
        </div>
        {result && <p className="mt-3 font-mono text-sm">{result}</p>}
      </section>
    </>
  );
}
