"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lang, dict, tr } from "../lib/i18n";
import { lbScores } from "../lib/lb";
import { showdown } from "../lib/showdown";
import { simple } from "../lib/simple";

const TABPFN = "var(--tabpfn)";
const TABPFN_SOFT = "var(--tabpfn-soft)";
const WINNER = "var(--winner)";
const SAND_STRONG = "var(--sand-strong)";
const GRID = "var(--chart-grid)";
const TICK = "var(--muted)";

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--chart-grid)",
  borderRadius: "0.5rem",
  color: "var(--fg)",
  fontSize: "12px",
} as const;

export function ChartCard({
  title,
  sub,
  children,
  badge,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <section className="card mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {badge ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: TABPFN_SOFT, color: TABPFN }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm opacity-80">{sub}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function shortModel(model: string): string {
  if (model === "tabpfn") return "TabPFN";
  if (model === "ensemble") return "ENS";
  return model.toUpperCase();
}

/** (1) LB duel grouped-bar: our 5 reproducible submissions, public + private. */
export function LbDuelChart({ lang }: { lang: Lang }) {
  const rows = [
    ...lbScores.ours.map((e) => ({
      name: shortModel(e.model),
      public: e.public_score,
      private: e.private_score,
      isTabpfn: e.model === "tabpfn",
      isRef: false,
    })),
  ];
  const pubLabel = tr(lang, dict.lb.public);
  const privLabel = tr(lang, dict.lb.private);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold" style={{ color: TABPFN }}>
        {tr(lang, dict.perf.crownNote)}
      </p>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={3}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: TICK, fontSize: 12 }} interval={0} angle={-12} height={44} />
            <YAxis
              domain={[0.7, 0.9]}
              tick={{ fill: TICK, fontSize: 12 }}
              tickFormatter={(v: number) => v.toFixed(2)}
              width={44}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [(v as number).toFixed(4), ""]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="public" name={pubLabel} radius={[4, 4, 0, 0]}>
              {rows.map((r) => (
                <Cell
                  key={r.name}
                  fill={r.isTabpfn ? TABPFN : r.isRef ? SAND_STRONG : WINNER}
                  stroke={r.isTabpfn ? TABPFN : undefined}
                  strokeWidth={r.isTabpfn ? 2 : 0}
                  fillOpacity={r.isTabpfn || r.isRef ? 1 : 0.55}
                />
              ))}
              <LabelList
                dataKey="public"
                position="top"
                formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(3) : "")}
                style={{ fontSize: 10, fill: TICK }}
              />
            </Bar>
            <Bar dataKey="private" name={privLabel} radius={[4, 4, 0, 0]}>
              {rows.map((r) => (
                <Cell
                  key={r.name}
                  fill={r.isTabpfn ? TABPFN_SOFT : r.isRef ? SAND_STRONG : WINNER}
                  stroke={r.isTabpfn ? TABPFN : undefined}
                  strokeWidth={r.isTabpfn ? 2 : 0}
                  fillOpacity={r.isTabpfn || r.isRef ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** (2) Fold-by-fold accuracy LineChart with mean ± std band. */
export function FoldAccuracyChart({ lang }: { lang: Lang }) {
  const { winner, tabpfn } = showdown;
  const data = winner.folds.map((f, i) => ({
    fold: `F${f.fold}`,
    winner: f.accuracy,
    tabpfn: tabpfn.folds[i]?.accuracy ?? null,
    simple: simple.folds[i]?.accuracy ?? null,
    tabpfnTop: tabpfn.acc + tabpfn.acc_std,
    tabpfnBot: tabpfn.acc - tabpfn.acc_std,
    winnerTop: winner.acc + winner.acc_std,
    winnerBot: winner.acc - winner.acc_std,
  }));
  const wLabel = tr(lang, dict.common.winner);
  const tLabel = tr(lang, dict.common.tabpfn);
  const stdLabel = "±std";
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="fold" tick={{ fill: TICK, fontSize: 12 }} />
          <YAxis
            domain={[0.84, 0.92]}
            tick={{ fill: TICK, fontSize: 12 }}
            tickFormatter={(v: number) => v.toFixed(2)}
            width={44}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [(v as number).toFixed(4), ""]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="tabpfnTop"
            name={`${tLabel} ${stdLabel}`}
            stroke="none"
            fill={TABPFN}
            fillOpacity={0.14}
            legendType="none"
            tooltipType="none"
          />
          <Area
            type="monotone"
            dataKey="tabpfnBot"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            legendType="none"
            tooltipType="none"
          />
          <Area
            type="monotone"
            dataKey="winnerTop"
            name={`${wLabel} ${stdLabel}`}
            stroke="none"
            fill={WINNER}
            fillOpacity={0.12}
            legendType="none"
            tooltipType="none"
          />
          <Area
            type="monotone"
            dataKey="winnerBot"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            legendType="none"
            tooltipType="none"
          />
          <Line type="monotone" dataKey="tabpfn" name={tLabel} stroke={TABPFN} strokeWidth={3} dot={{ r: 5, fill: TABPFN }} />
          <Line
            type="monotone"
            dataKey="winner"
            name={wLabel}
            stroke={WINNER}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 4, fill: WINNER }}
          />
          <Line
            type="monotone"
            dataKey="simple"
            name={tr(lang, dict.common.simple)}
            stroke={SAND_STRONG}
            strokeWidth={2}
            strokeDasharray="2 2"
            dot={{ r: 3, fill: SAND_STRONG }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** (3) Train-time comparison bars: 71.087s vs 7.23s. */
export function TrainTimeChart({ lang }: { lang: Lang }) {
  const rows = [
    { name: tr(lang, dict.common.winner), s: showdown.winner.train_time_s_mean },
    { name: tr(lang, dict.common.tabpfn), s: showdown.tabpfn.train_time_s_mean },
    { name: tr(lang, dict.common.simple), s: simple.train_time_s_mean },
  ];
  return (
    <div>
      <p className="mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: TABPFN_SOFT, color: TABPFN }}>
        {tr(lang, dict.perf.fasterNote)} — 71.1s → 7.2s
      </p>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: TICK, fontSize: 13 }} />
            <YAxis
              tick={{ fill: TICK, fontSize: 12 }}
              label={{ value: "s", position: "top", offset: 8, fill: TICK, fontSize: 12 }}
              width={48}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${(v as number).toFixed(2)} s`, ""]} />
            <Bar dataKey="s" radius={[6, 6, 0, 0]}>
              {rows.map((r, i) => (
                <Cell key={r.name} fill={i === 1 ? TABPFN : WINNER} fillOpacity={i === 1 ? 1 : 0.55} />
              ))}
              <LabelList
                dataKey="s"
                position="top"
                formatter={(v: unknown) => (typeof v === "number" ? `${v.toFixed(1)}s` : "")}
                style={{ fontSize: 13, fontWeight: 700, fill: TABPFN }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** (4) Metric radar: acc / F1 / IoU local CV means. */
export function MetricRadarChart({ lang }: { lang: Lang }) {
  const { winner, tabpfn } = showdown;
  void lang;
  const data = [
    { metric: "Accuracy", winner: winner.acc, tabpfn: tabpfn.acc, simple: simple.acc },
    { metric: "F1", winner: winner.f1, tabpfn: tabpfn.f1, simple: simple.f1 },
    { metric: "IoU", winner: winner.iou, tabpfn: tabpfn.iou, simple: simple.iou },
  ];
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: TICK, fontSize: 13 }} />
          <PolarRadiusAxis domain={[0.4, 1.0]} tick={{ fill: TICK, fontSize: 10 }} tickCount={4} />
          <Radar name="TabPFN-3.5" dataKey="tabpfn" stroke={TABPFN} fill={TABPFN} fillOpacity={0.35} strokeWidth={3} dot />
          <Radar name="Winner" dataKey="winner" stroke={WINNER} fill={WINNER} fillOpacity={0.15} strokeWidth={2} strokeDasharray="6 3" dot />
          <Radar name="Simple" dataKey="simple" stroke={SAND_STRONG} fill={SAND_STRONG} fillOpacity={0.15} strokeWidth={2} strokeDasharray="2 2" dot />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [(v as number).toFixed(4), ""]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
