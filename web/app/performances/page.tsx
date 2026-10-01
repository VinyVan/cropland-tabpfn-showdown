"use client";

import { Nav, useLang, Bar } from "../../components/ui";
import { dict, tr } from "../../lib/i18n";
import { ModelSummary, showdown } from "../../lib/showdown";

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
      <SummaryTable name={tr(lang, dict.common.winner)} m={showdown.winner} />
      <SummaryTable name={tr(lang, dict.common.tabpfn)} m={showdown.tabpfn} />
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
