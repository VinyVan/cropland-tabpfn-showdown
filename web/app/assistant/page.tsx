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

  const chips = [
    { fr: "Prédis une parcelle avec TabPFN", en: "Predict a parcel with TabPFN" },
    { fr: "Compare les modèles (leaderboard)", en: "Compare models (leaderboard)" },
    { fr: "Pourquoi TabPFN est-il puissant ?", en: "Why is TabPFN powerful?" },
  ];

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
              const toolName =
                String((event.toolCallName as string) ?? "") ||
                (out && typeof out === "object" && "model" in out
                  ? "predict_parcel"
                  : "result");
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
        {t("Assistant Sahel Agri 🤖", "Sahel Agri assistant 🤖")}
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
            key={c.en}
            className="card !px-3 !py-1 text-sm"
            disabled={busy}
            onClick={() => send(lang === "fr" ? c.fr : c.en)}
          >
            {lang === "fr" ? c.fr : c.en}
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
