"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Nav, useLang, Bar } from "../components/ui";
import { LbDuelChart } from "../components/charts";
import { dict, tr } from "../lib/i18n";
import { lbScores } from "../lib/lb";
import { showdown } from "../lib/showdown";

const MapView = dynamic(() => import("./carte/MapView"), { ssr: false });

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

  const sections: { title: string; body: string; href: string }[] = [
    { title: tr(lang, dict.home.secMethods), body: tr(lang, dict.home.secMethodsBody), href: "/methodes" },
    { title: tr(lang, dict.home.secWhy), body: tr(lang, dict.home.secWhyBody), href: "/pourquoi-tabpfn" },
    { title: tr(lang, dict.home.secAssistant), body: tr(lang, dict.home.secAssistantBody), href: "/assistant" },
  ];

  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.home.title)}</h1>
      <p className="mt-2 opacity-80">{tr(lang, dict.home.subtitle)}</p>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">{tr(lang, dict.home.verdict)}</h2>
        <p className="mt-2">{tr(lang, verdict)}</p>
        <Bar label={`${tr(lang, dict.common.winner)} — accuracy (CV)`} value={w} />
        <Bar label={`${tr(lang, dict.common.tabpfn)} — accuracy (CV)`} value={t} />
        <h3 className="mt-4 font-semibold">{tr(lang, dict.lb.title)}</h3>
        <Bar label="TabPFN — public" value={0.8667} />
        <Bar label="TabPFN — privé / private" value={0.8381} />
        <Bar label="Ensemble — public" value={0.8278} />
        <Bar label="Ensemble — privé / private" value={0.8262} />
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
        <h2 className="text-xl font-semibold">{tr(lang, dict.home.secResults)}</h2>
        <p className="mt-1 text-sm opacity-80">{tr(lang, dict.home.secResultsBody)}</p>
        <div className="mt-3"><LbDuelChart lang={lang} /></div>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {lbScores.ours.map((e) => (
              <tr key={e.model} className="border-t">
                <td className="py-1 font-mono">{e.model}</td>
                <td className="py-1 text-right font-mono">{e.public_score.toFixed(4)}</td>
                <td className="py-1 text-right font-mono">{e.private_score.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link className="mt-2 inline-block text-sm font-medium underline" href="/performances">
          {tr(lang, dict.home.go)}
        </Link>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <section key={s.href} className="card">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm opacity-80">{s.body}</p>
            <Link className="mt-2 inline-block text-sm font-medium underline" href={s.href}>
              {tr(lang, dict.home.go)}
            </Link>
          </section>
        ))}
      </div>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">{tr(lang, dict.home.secMap)}</h2>
        <p className="mt-1 text-sm opacity-80">{tr(lang, dict.home.secMapBody)}</p>
        <div className="mt-3" style={{ height: 380 }}>
          <MapView mode="tabpfn" />
        </div>
        <Link className="mt-2 inline-block text-sm font-medium underline" href="/carte">
          {tr(lang, dict.home.go)}
        </Link>
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
