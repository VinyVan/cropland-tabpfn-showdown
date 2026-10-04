"use client";

import { useRef, useState } from "react";
import { HttpAgent } from "@ag-ui/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Nav, useLang } from "../../components/ui";
import { dict, tr } from "../../lib/i18n";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  charts?: { tool: string; data: unknown }[];
  pendingTool?: string | null;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function ChartBlock({ tool, data }: { tool: string; data: unknown }) {
  const d = data as Record<string, unknown>;
  if (tool === "predict_parcel" && d && typeof d === "object" && "proba" in d) {
    const proba = Number(d.proba ?? 0);
    const label = Number(d.label ?? 0);
    return (
      <div className="card mt-2 !border-[var(--accent)]">
        <div className="text-sm font-semibold">
          {String(d.model ?? tool)} → {label === 1 ? "🌾 cropland" : "🏜️ non-cropland"}
        </div>
        <div className="mt-1 h-3 rounded bg-black/10">
          <div
            className="h-3 rounded"
            style={{ width: `${Math.round(proba * 100)}%`, background: "var(--accent)" }}
          />
        </div>
        <div className="mt-1 text-xs opacity-70">p = {proba.toFixed(4)}</div>
      </div>
    );
  }
  const rows: { name: string; value: number }[] = [];
  if (tool === "get_lb_scores" && d && typeof d === "object") {
    const ours = (d.ours ?? d.submissions ?? []) as Array<Record<string, unknown>>;
    for (const s of ours.slice(0, 6)) {
      const name = String(s.model ?? s.name ?? "?");
      rows.push({ name: `${name} pub`, value: Number(s.public_score ?? s.public ?? 0) });
    }
    const regModels = (d.models ?? []) as Array<Record<string, unknown>>;
    for (const s of regModels.slice(0, 6)) {
      const name = String(s.name ?? "?");
      if (s.lb_public !== undefined)
        rows.push({ name: `${name} pub`, value: Number(s.lb_public) });
    }
  } else if (tool === "get_duel_stats" && d && typeof d === "object") {
    for (const m of ["winner", "tabpfn"]) {
      const mm = (d[m] ?? {}) as Record<string, unknown>;
      rows.push({ name: `${m} acc`, value: Number(mm.acc ?? 0) });
      rows.push({ name: `${m} F1`, value: Number(mm.f1 ?? 0) });
    }
  } else if (tool === "get_map_stats" && d && typeof d === "object") {
    const counts = (d.cropland_counts ?? {}) as Record<string, number>;
    for (const [k, v] of Object.entries(counts)) rows.push({ name: k, value: Number(v) });
  }
  if (!rows.length) return null;
  return (
    <div className="card mt-2">
      <div className="mb-1 text-xs font-semibold opacity-70">{tool}</div>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} height={44} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} />
            <Tooltip />
            <Bar dataKey="value">
              {rows.map((r, i) => (
                <Cell
                  key={i}
                  fill={r.name.startsWith("tabpfn") ? "var(--accent)" : "var(--sand-strong, #999)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [lang, setLang] = useLang();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const threadRef = useRef<string>(uid());
  const agentRef = useRef<HttpAgent | null>(null);

  const t = (fr: string, en: string) => (lang === "fr" ? fr : en);

  const chips: { key: "predict" | "compare" | "why"; label: string; prompt: string }[] = [
    {
      key: "predict",
      label: lang === "fr" ? "Prédis une parcelle avec TabPFN" : "Predict a parcel with TabPFN",
      prompt:
        "Prédis la parcelle exemple 0 avec TabPFN et explique le verdict en une phrase.",
    },
    {
      key: "compare",
      label: lang === "fr" ? "Compare les modèles (leaderboard)" : "Compare models (leaderboard)",
      prompt:
        "Compare les modèles : scores Zindi puis chiffres locaux GroupKFold, une phrase de verdict.",
    },
    {
      key: "why",
      label: lang === "fr" ? "Pourquoi TabPFN est-il puissant ?" : "Why is TabPFN powerful?",
      prompt:
        "Pourquoi TabPFN est-il puissant ? 3 points courts avec chiffres.",
    },
  ];

  async function sendDirect(kind: "predict" | "compare" | "why") {
    if (busy) return;
    const aiId = uid();
    const label =
      chips.find((c) => c.key === kind)?.label ?? kind;
    setMsgs((prev) => [
      ...prev,
      { id: uid(), role: "user", text: label },
      { id: aiId, role: "assistant", text: "", charts: [] },
    ]);
    setBusy(true);
    try {
      if (kind === "predict") {
        const s = await (await fetch("/api/py/sample")).json();
        const r = await (
          await fetch("/api/py/predict?model=tabpfn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ row: s.row ?? s }),
          })
        ).json();
        const p = Number(r.proba ?? 0);
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  text: t(
                    `TabPFN : ${r.label === 1 ? "cultivée 🌾" : "non cultivée 🏜️"} (p = ${p.toFixed(4)}).`,
                    `TabPFN: ${r.label === 1 ? "cropland 🌾" : "not cropland 🏜️"} (p = ${p.toFixed(4)}).`
                  ),
                  charts: [{ tool: "predict_parcel", data: { model: "tabpfn", ...r } }],
                }
              : m
          )
        );
      } else if (kind === "compare") {
        const [lb, duel] = await Promise.all([
          (await fetch("/api/py/models")).json(),
          (await fetch("/api/py/metrics")).json(),
        ]);
        void lb;
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  text: t(
                    "TabPFN mène en public (0,8667) ; match nul en privé (0,8381). Détail local : acc 0,8851 vs 0,8801.",
                    "TabPFN leads public (0.8667); tied private (0.8381). Local: acc 0.8851 vs 0.8801."
                  ),
                  charts: [
                    { tool: "get_lb_scores", data: lb },
                    { tool: "get_duel_stats", data: duel },
                  ],
                }
              : m
          )
        );
      } else {
        const duel = await (await fetch("/api/py/metrics")).json();
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  text: t(
                    "1) Zéro tuning ni feature engineering. 2) 7,2s vs 71,1s par fold (≈10×). 3) Devant en public Zindi (0,8667) et en CV (0,8851).",
                    "1) Zero tuning or feature engineering. 2) 7.2s vs 71.1s per fold (≈10×). 3) Ahead on Zindi public (0.8667) and CV (0.8851)."
                  ),
                  charts: [{ tool: "get_duel_stats", data: duel }],
                }
              : m
          )
        );
      }
    } catch (e) {
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, text: `⚠️ ${String(e)}` } : m
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    if (!agentRef.current) agentRef.current = new HttpAgent({ url: "/api/py/agui" });
    const agent = agentRef.current;
    const userMsg: ChatMsg = { id: uid(), role: "user", text: clean };
    const aiId = uid();
    const history = [...msgs, userMsg];
    setMsgs([...history, { id: aiId, role: "assistant", text: "", charts: [] }]);
    setInput("");
    setBusy(true);
    const aguiMessages = history.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.text,
    }));
    try {
      await agent.runAgent(
        {
          threadId: threadRef.current,
          runId: uid(),
          messages: aguiMessages,
          tools: [],
          context: [],
          forwardedProps: {},
        } as never,
        {
          onEvent: ({ event }: { event: Record<string, unknown> }) => {
            const type = String(event.type ?? "");
            if (type === "TEXT_MESSAGE_CONTENT") {
              const delta =
                String((event.delta as string) ?? (event.text as string) ?? "");
              if (delta)
                setMsgs((prev) =>
                  prev.map((m) => (m.id === aiId ? { ...m, text: m.text + delta } : m))
                );
            } else if (type === "TOOL_CALL_START") {
              const name = String(
                (event.toolCallName as string) ?? (event.name as string) ?? "tool"
              );
              setMsgs((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, pendingTool: name } : m))
              );
            } else if (type === "TOOL_CALL_RESULT" || type === "TOOL_CALL_END") {
              const raw =
                (event.content as unknown) ??
                (event.result as unknown) ??
                (event.output as unknown);
              let payload: unknown = raw;
              if (typeof raw === "string") {
                try {
                  payload = JSON.parse(raw);
                } catch {
                  payload = { text: raw };
                }
              }
              const out = payload as Record<string, unknown>;
              const called = String((event.toolCallName as string) ?? "");
              let toolName = called;
              if (!toolName && out && typeof out === "object") {
                if ("proba" in out && "model" in out) toolName = "predict_parcel";
                else if ("ours" in out || "submissions" in out) toolName = "get_lb_scores";
                else if ("winner" in out && "tabpfn" in out) toolName = "get_duel_stats";
                else if ("cropland_counts" in out) toolName = "get_map_stats";
                else toolName = "";
              }
              setMsgs((prev) =>
                prev.map((m) =>
                  m.id === aiId
                    ? {
                        ...m,
                        pendingTool: null,
                        charts: [...(m.charts ?? []), { tool: toolName, data: payload }],
                      }
                    : m
                )
              );
            } else if (type === "RUN_ERROR") {
              const msg = String((event.message as string) ?? "agent error");
              setMsgs((prev) =>
                prev.map((m) =>
                  m.id === aiId ? { ...m, text: m.text + `\n⚠️ ${msg}` } : m
                )
              );
            }
          },
        } as never
      );
    } catch (e) {
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, text: m.text + `\n⚠️ ${String(e)}` } : m
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <Nav lang={lang} setLang={setLang} />
      <h1 className="mt-2 text-2xl font-bold">
        {t("Assistant Agri 🤖", "Agri assistant 🤖")}
      </h1>
      <p className="mt-1 text-sm opacity-80">
        {t(
          "Propulsé par muse-spark-1.3-contributor (LangGraph + AG-UI). Prédictions, explications, graphiques.",
          "Powered by muse-spark-1.3-contributor (LangGraph + AG-UI). Predictions, explanations, charts."
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.label}
            className="card !px-3 !py-1 text-sm"
            disabled={busy}
            onClick={() => sendDirect(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {msgs.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-full rounded px-3 py-2 text-left text-sm ${
                m.role === "user" ? "bg-black/10" : "card w-full"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {m.text || (m.role === "assistant" ? "…" : "")}
              </div>
              {m.pendingTool && (
                <div className="mt-1 text-xs opacity-60">🔧 {m.pendingTool}…</div>
              )}
              {(m.charts ?? []).map((c, i) => {
                return <ChartBlock key={i} tool={c.tool} data={c.data} />;
              })}
            </div>
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="card flex-1 !py-2 text-sm"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Posez votre question…", "Ask your question…")}
        />
        <button className="card !px-4 !py-2 text-sm font-semibold" disabled={busy} type="submit">
          {busy ? "…" : t("Envoyer", "Send")}
        </button>
      </form>
      <p className="mt-2 text-xs opacity-60">{tr(lang, dict.assistant.note)}</p>
    </main>
  );
}
