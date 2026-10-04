"use client";

import Link from "next/link";
import { useState } from "react";
import { Nav, useLang, Bar } from "../components/ui";
import { dict, tr } from "../lib/i18n";
import { showdown } from "../lib/showdown";

export default function Home() {
  const [lang, setLang] = useLang();
  const [result, setResult] = useState<string>("");
  const [gauge, setGauge] = useState<number | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [samples, setSamples] = useState<{ id: string; row: Record<string, unknown> }[]>([]);
  const [sampleId, setSampleId] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);

  async function loadSamples() {
    try {
      const s = await fetch("/api/py/samples?n=5").then((r) => r.json());
      const list = (s.samples ?? []) as { id: string; row: Record<string, unknown> }[];
      setSamples(list);
      if (list.length && !sampleId) setSampleId(list[0].id);
    } catch {
      /* keep sample fallback */
    }
  }

  const w = showdown.winner.acc;
  const t = showdown.tabpfn.acc;
  const verdict =
    t > w
      ? { fr: `TabPFN-3.5 passe devant (${t} vs ${w} accuracy) — sans tuning ni feature engineering.`, en: `TabPFN-3.5 leads (${t} vs ${w} accuracy) — no tuning, no feature engineering.`, de: `TabPFN-3.5 liegt vorn (${t} vs ${w} Accuracy) — ohne Tuning, ohne Feature-Engineering.` }
      : { fr: `Le gagnant garde la tête (${w} vs ${t} accuracy) — TabPFN reste au contact sans tuning.`, en: `The winner stays ahead (${w} vs ${t} accuracy) — TabPFN stays close with no tuning.`, de: `Der Sieger bleibt vorn (${w} vs ${t} Accuracy) — TabPFN bleibt ohne Tuning dran.` };

  async function demoPredict(model: "winner" | "tabpfn" | "simple") {
    setLoading(model);
    setResult("");
    setGauge(null);
    try {
      let body: string;
      let ctype = "application/json";
      if (csvText) {
        body = csvText;
        ctype = "text/csv";
      } else if (sampleId) {
        const found = samples.find((s) => s.id === sampleId);
        if (found) body = JSON.stringify(found.row);
        else {
          const sample = await fetch("/api/py/sample").then((r) => r.json());
          body = JSON.stringify(sample.row ?? sample);
        }
      } else {
        const sample = await fetch("/api/py/sample").then((r) => r.json());
        body = JSON.stringify(sample.row ?? sample);
      }
      const res = await fetch(`/api/py/predict?model=${model}`, {
        method: "POST",
        headers: { "content-type": ctype },
        body,
      }).then((r) => r.json());
      setResult(`${model}: label=${res.label} proba=${res.proba}`);
      if (typeof res.proba === "number") setGauge(res.proba);
    } catch (e) {
      setResult(`error: ${String(e)}`);
    } finally {
      setLoading(null);
    }
  }

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => setCsvText(String(rd.result ?? ""));
    rd.readAsText(f);
  }

  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.home.title)}</h1>
      <p className="mt-2 opacity-80">{tr(lang, dict.home.subtitle)}</p>

      <section className="card mt-6">
        <h2 className="text-xl font-semibold">{tr(lang, dict.home.verdict)}</h2>
        <p className="mt-2">{tr(lang, verdict)}</p>
        <Bar label={`${tr(lang, dict.common.winner)} — accuracy (CV)`} value={w} color="var(--winner, #B08945)" />
        <Bar label={`${tr(lang, dict.common.tabpfn)} — accuracy (CV)`} value={t} />
        <h3 className="mt-4 font-semibold">{tr(lang, dict.lb.title)}</h3>
        <Bar label="TabPFN — public" value={0.8667} />
        <Bar label="TabPFN — privé / private" value={0.8381} />
        <Bar label="Ensemble — public" value={0.8278} color="var(--winner, #B08945)" />
        <Bar label="Ensemble — privé / private" value={0.8262} color="var(--winner, #B08945)" />
        <Bar label="Simple — public" value={0.8333} color="var(--sand-strong, #999)" />
        <Bar label="Simple — privé / private" value={0.8167} color="var(--sand-strong, #999)" />
        <div className="mt-4 flex flex-wrap gap-3">
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="card !p-3 text-sm underline" onClick={loadSamples}>
            🔀 {tr(lang, { fr: "Exemples", en: "Samples", de: "Beispiele" })}
          </button>
          {samples.length > 0 && (
            <select
              className="card !p-2 text-sm"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
            >
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          )}
          {(["winner", "tabpfn", "simple"] as const).map((m) => (
            <button
              key={m}
              className="card !p-3 border underline"
              onClick={() => demoPredict(m)}
              disabled={loading !== null}
            >
              {loading === m ? "…" : `${tr(lang, dict.home.predict)} — ${m}`}
            </button>
          ))}
          <label className="card !p-3 text-sm underline cursor-pointer">
            {csvText ? "CSV ✓" : "CSV…"}
            <input type="file" accept=".csv" className="hidden" onChange={onCsv} />
          </label>
          {csvText && (
            <button className="text-sm underline opacity-70" onClick={() => setCsvText(null)}>
              ✕
            </button>
          )}
        </div>
        {result && <p className="mt-3 font-mono text-sm">{result}</p>}
        {gauge !== null && (
          <div className="mt-2">
            <div className="h-3 rounded bg-black/10">
              <div
                className="h-3 rounded"
                style={{ width: `${Math.round(gauge * 100)}%`, background: "var(--accent)" }}
              />
            </div>
            <p className="mt-1 text-xs opacity-70">p = {gauge.toFixed(4)}</p>
          </div>
        )}
      </section>
    </>
  );
}
