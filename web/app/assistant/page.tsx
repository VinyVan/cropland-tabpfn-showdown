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
        {T(lang, "Assistant Agri", "Agri assistant", "Agri-Assistent")}
      </h1>
      <ChatPanel />
      <p className="mt-2 text-xs opacity-60">{tr(lang, dict.assistant.note)}</p>
    </main>
  );
}
