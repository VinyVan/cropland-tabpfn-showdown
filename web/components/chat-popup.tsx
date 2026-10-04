"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "./chat";
import { useLang } from "./ui";
import type { Lang } from "../lib/i18n";

function T(lang: Lang, fr: string, en: string, de: string): string {
  return lang === "fr" ? fr : lang === "de" ? de : en;
}

export function ChatPopup() {
  const [lang] = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem("agri-chat-seen")) {
        const t = setTimeout(() => {
          setOpen(true);
          window.localStorage.setItem("agri-chat-seen", "1");
        }, 6000);
        return () => clearTimeout(t);
      }
    } catch {
      /* private mode: stay closed */
    }
    return undefined;
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="chat"
        className="card fixed bottom-5 right-5 z-50 !rounded-full !p-3 text-xl shadow-lg"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {open ? "✕" : "🤖"}
      </button>
      {open && (
        <div className="card fixed bottom-20 right-5 z-50 flex max-h-[70vh] w-[min(92vw,380px)] flex-col !p-3 shadow-xl">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold">
              {T(lang, "Assistant Agri 🤖", "Agri assistant 🤖", "Agri-Assistent 🤖")}
            </span>
            <button
              className="text-sm opacity-60"
              onClick={() => setOpen(false)}
              aria-label="close"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatPanel compact />
          </div>
        </div>
      )}
    </>
  );
}
