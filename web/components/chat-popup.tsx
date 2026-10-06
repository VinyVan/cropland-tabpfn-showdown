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
        {open ? "✕" : "💬"}
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex max-h-[70vh] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/10">
          <div
            className="px-4 py-3 text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), #0d3b2e)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {T(lang, "Assistant Agri", "Agri assistant", "Agri-Assistent")}
              </span>
              <button
                className="rounded-full px-2 py-0.5 text-sm opacity-80 hover:opacity-100"
                onClick={() => setOpen(false)}
                aria-label="close"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="card min-h-0 flex-1 overflow-y-auto !rounded-none !border-0">
            <ChatPanel compact />
          </div>
        </div>
      )}
    </>
  );
}
