"use client";

import { Nav, useLang } from "../../components/ui";
import { ChatPanel } from "../../components/chat";
import { dict, tr } from "../../lib/i18n";
import type { Lang } from "../../lib/i18n";

function T(lang: Lang, fr: string, en: string, de: string): string {
  return lang === "fr" ? fr : lang === "de" ? de : en;
}

export default function AssistantPage() {
  const [lang, setLang] = useLang();
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <Nav lang={lang} setLang={setLang} />
      <h1 className="mt-2 text-2xl font-bold">
        {T(lang, "Assistant Agri 🤖", "Agri assistant 🤖", "Agri-Assistent 🤖")}
      </h1>
      <p className="mt-1 text-sm opacity-80">
        {T(
          lang,
          "Propulsé par muse-spark-1.3-contributor (LangGraph + AG-UI). Prédictions, explications, graphiques.",
          "Powered by muse-spark-1.3-contributor (LangGraph + AG-UI). Predictions, explanations, charts.",
          "Mit muse-spark-1.3-contributor (LangGraph + AG-UI). Vorhersagen, Erklärungen, Diagramme."
        )}
      </p>
      <ChatPanel />
      <p className="mt-2 text-xs opacity-60">{tr(lang, dict.assistant.note)}</p>
    </main>
  );
}
