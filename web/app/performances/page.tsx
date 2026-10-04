"use client";

import { Nav, useLang, Bar } from "../../components/ui";
import {
  ChartCard,
  FoldAccuracyChart,
  LbDuelChart,
  MetricRadarChart,
  TrainTimeChart,
} from "../../components/charts";
import { dict, tr } from "../../lib/i18n";
import { lbScores } from "../../lib/lb";
import { ModelSummary, showdown } from "../../lib/showdown";

function StoryStrip({ lang }: { lang: "fr" | "en" }) {
  const cards = [
    { emoji: "🔧", title: tr(lang, dict.perf.cardNoTuning), body: tr(lang, dict.perf.cardNoTuningBody) },
    { emoji: "🧱", title: tr(lang, dict.perf.cardNoFe), body: tr(lang, dict.perf.cardNoFeBody) },
    { emoji: "⚡", title: tr(lang, dict.perf.cardOnePass), body: tr(lang, dict.perf.cardOnePassBody) },
    { emoji: "🚀", title: tr(lang, dict.perf.cardFaster), body: tr(lang, dict.perf.cardFasterBody) },
  ];
  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold">{tr(lang, dict.perf.storyTitle)}</h2>
      <p className="mt-1 text-sm opacity-80">{tr(lang, dict.perf.storySub)}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="card">
            <div className="text-2xl">{c.emoji}</div>
            <h3 className="mt-1 font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm opacity-80">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryTable({ name, m }: { name: string; m: ModelSummary }) {
  return (
    <div className="card mt-4">
      <h3 className="font-semibold">{name}</h3>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {(
            [
              ["accuracy", `${m.acc} ± ${m.acc_std}`],
              ["F1", `${m.f1} ± ${m.f1_std}`],
              ["IoU", `${m.iou} ± ${m.iou_std}`],
            ] as const
          ).map(([k, v]) => (
            <tr key={k} className="border-t">
              <td className="py-1">{k}</td>
              <td className="py-1 text-right font-mono">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Bar label="accuracy" value={m.acc} />
      <Bar label="F1" value={m.f1} />
      <Bar label="IoU" value={m.iou} />
    </div>
  );
}

function FoldTable({ name, m, lang }: { name: string; m: ModelSummary; lang: "fr" | "en" }) {
  return (
    <div className="card mt-4 overflow-x-auto">
      <h3 className="font-semibold">
        {name} — {tr(lang, dict.perf.perFold)}
      </h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>fold</th>
            <th className="text-right">acc</th>
            <th className="text-right">F1</th>
            <th className="text-right">IoU</th>
            <th className="text-right">train s</th>
            <th className="text-right">infer s</th>
          </tr>
        </thead>
        <tbody>
          {m.folds.map((f) => (
            <tr key={f.fold} className="border-t">
              <td>{f.fold}</td>
              <td className="text-right font-mono">{f.accuracy.toFixed(4)}</td>
              <td className="text-right font-mono">{f.f1.toFixed(4)}</td>
              <td className="text-right font-mono">{f.iou.toFixed(4)}</td>
              <td className="text-right font-mono">{f.train_time_s}</td>
              <td className="text-right font-mono">{f.infer_time_s}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Performances() {
  const [lang, setLang] = useLang();
  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.perf.title)}</h1>
      <p className="mt-2 opacity-80">{tr(lang, dict.perf.subtitle)}</p>

      <StoryStrip lang={lang} />

      <ChartCard title={tr(lang, dict.perf.lbChartTitle)} sub={tr(lang, dict.perf.lbChartSub)} badge="TabPFN 👑 0.8667">
        <LbDuelChart lang={lang} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:gap-4">
        <ChartCard title={tr(lang, dict.perf.foldChartTitle)} sub={tr(lang, dict.perf.foldChartSub)}>
          <FoldAccuracyChart lang={lang} />
        </ChartCard>
        <ChartCard title={tr(lang, dict.perf.timeChartTitle)} sub={tr(lang, dict.perf.timeChartSub)} badge="9.8×">
          <TrainTimeChart lang={lang} />
        </ChartCard>
      </div>

      <ChartCard title={tr(lang, dict.perf.metricChartTitle)} sub={tr(lang, dict.perf.metricChartSub)}>
        <MetricRadarChart lang={lang} />
      </ChartCard>

      <SummaryTable name={tr(lang, dict.common.winner)} m={showdown.winner} />
      <SummaryTable name={tr(lang, dict.common.tabpfn)} m={showdown.tabpfn} />

      <section className="card mt-6 overflow-x-auto">
        <h2 className="text-xl font-semibold">{tr(lang, dict.lb.title)}</h2>
        <p className="mt-2 text-sm opacity-80">{tr(lang, dict.lb.subtitle)}</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>{tr(lang, dict.lb.model)}</th>
              <th className="text-right">{tr(lang, dict.lb.public)}</th>
              <th className="text-right">{tr(lang, dict.lb.private)}</th>
              <th>{tr(lang, dict.lb.note)}</th>
            </tr>
          </thead>
          <tbody>
            {lbScores.ours.map((e) => (
              <tr key={e.model} className="border-t">
                <td className="py-1 font-mono">{e.model}</td>
                <td className="py-1 text-right font-mono">
                  {e.public_score.toFixed(4)}
                </td>
                <td className="py-1 text-right font-mono">
                  {e.private_score.toFixed(4)}
                </td>
                <td className="py-1 text-xs opacity-80">{e.comment}</td>
              </tr>
            ))}
            <tr className="border-t">
              <td className="py-1 font-mono">before</td>
              <td className="py-1 text-right font-mono">
                {lbScores.user_best_before.public_score.toFixed(4)}
              </td>
              <td className="py-1 text-right font-mono">
                {lbScores.user_best_before.private_score.toFixed(4)}
              </td>
              <td className="py-1 text-xs opacity-80">user best before</td>
            </tr>
          </tbody>
        </table>
      </section>

      <h2 className="mt-6 text-xl font-semibold">
        {tr(lang, dict.perf.recall)} — {tr(lang, dict.perf.times)}:{" "}
        {showdown.stratified_recall.winner.train_time_s_mean}s /{" "}
        {showdown.stratified_recall.tabpfn.train_time_s_mean}s
      </h2>
      <p className="font-mono text-sm">
        winner acc {showdown.stratified_recall.winner.acc} · tabpfn acc{" "}
        {showdown.stratified_recall.tabpfn.acc}
      </p>
      <FoldTable name={tr(lang, dict.common.winner)} m={showdown.winner} lang={lang} />
      <FoldTable name={tr(lang, dict.common.tabpfn)} m={showdown.tabpfn} lang={lang} />
    </>
  );
}
