"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Nav, useLang } from "../../components/ui";
import { dict, tr } from "../../lib/i18n";
import type { MapMode } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <p className="mt-3 text-sm opacity-70">…</p>,
});

const MODES: MapMode[] = ["ensemble", "lgb", "cat", "xgb", "tabpfn", "simple", "agreement"];

export default function Carte() {
  const [lang, setLang] = useLang();
  const [mode, setMode] = useState<MapMode>("ensemble");

  return (
    <>
      {/* Leaflet CSS via CDN (zero npm deps). JS is injected as a CDN
          <script> by MapView (client-only, ssr:false). */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <Nav lang={lang} setLang={setLang} />
      <h1 className="text-3xl font-bold">{tr(lang, dict.map.title)}</h1>
      <p className="mt-2 opacity-80">{tr(lang, dict.map.subtitle)}</p>

      <section className="card mt-6 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="font-semibold">
            {tr(lang, dict.map.unanimous)}:
          </span>{" "}
          <span className="font-mono">544 / 600</span>
        </div>
        <div>
          <span className="font-semibold">{tr(lang, dict.map.disputed)}:</span>{" "}
          <span className="font-mono">56 / 600</span>
        </div>
        <div>
          <span className="font-semibold">
            {tr(lang, dict.map.tabpfnMajority)}:
          </span>{" "}
          <span className="font-mono">94.8%</span>
        </div>
      </section>

      <section className="card mt-4">
        <label className="text-sm font-medium">
          {tr(lang, dict.map.model)} :{" "}
          <select
            className="card !p-2 border text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as MapMode)}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m === "agreement" ? tr(lang, dict.map.agreementMode) : m}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3">
          <MapView mode={mode} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span>
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: "green" }}
            />{" "}
            {tr(lang, dict.map.legendCrop)}
          </span>
          <span>
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: "red" }}
            />{" "}
            {tr(lang, dict.map.legendNon)}
          </span>
          <span>
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: "orange" }}
            />{" "}
            {tr(lang, dict.map.legendDisputed)}
          </span>
          <span className="opacity-70">600 {tr(lang, dict.map.points)}</span>
        </div>
      </section>
    </>
  );
}
