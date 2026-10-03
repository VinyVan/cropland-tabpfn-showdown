"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lang, dict, tr } from "../lib/i18n";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("fr");
  useEffect(() => {
    const saved = window.localStorage.getItem("lang");
    if (saved === "fr" || saved === "en") setLang(saved);
  }, []);
  const set = (l: Lang) => {
    setLang(l);
    window.localStorage.setItem("lang", l);
  };
  return [lang, set];
}

export function useTheme(): ["light" | "dark", () => void] {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("theme", next);
  };
  return [theme, toggle];
}

export function Nav({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const pathname = usePathname();
  const [theme, toggleTheme] = useTheme();
  const links = [
    { href: "/", label: tr(lang, dict.nav.home) },
    { href: "/performances", label: tr(lang, dict.nav.perf) },
    { href: "/methodes", label: tr(lang, dict.nav.methods) },
    { href: "/pourquoi-tabpfn", label: tr(lang, dict.nav.why) },
    { href: "/carte", label: tr(lang, dict.nav.map) },
    { href: "/assistant", label: tr(lang, dict.nav.assistant) },
  ];
  return (
    <header className="flex flex-wrap items-center gap-3 justify-between py-4">
      <nav className="flex gap-4 text-sm font-medium">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "underline" : "opacity-70"}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex gap-2">
        <button
          className="card !p-2 text-sm"
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          aria-label="language"
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
        <button
          className="card !p-2 text-sm"
          onClick={toggleTheme}
          aria-label="theme"
          data-theme-toggle={theme}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
    </header>
  );
}

export function Bar({
  label,
  value,
  max = 1,
  color = "var(--accent)",
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  return (
    <div className="my-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{value.toFixed(4)}</span>
      </div>
      <div className="h-3 rounded bg-black/10">
        <div
          className="h-3 rounded"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}
