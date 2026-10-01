"use client";

import { useEffect, useRef } from "react";

export type MapMode = "ensemble" | "lgb" | "cat" | "xgb" | "tabpfn" | "agreement";

interface Pt {
  ID: string;
  location: string;
  lat: number;
  lon: number;
  pred_ensemble: number;
  pred_lgb: number;
  pred_cat: number;
  pred_xgb: number;
  pred_tabpfn: number;
  agreement: number;
}

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletNS = any;

function loadLeaflet(): Promise<LeafletNS> {
  const w = window as unknown as { L?: LeafletNS };
  if (w.L) return Promise.resolve(w.L);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () =>
        resolve((window as unknown as { L?: LeafletNS }).L)
      );
      return;
    }
    // Leaflet via CDN <script> (zero npm deps).
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve((window as unknown as { L?: LeafletNS }).L);
    s.onerror = () => reject(new Error("leaflet CDN load failed"));
    document.head.appendChild(s);
  });
}

function parseCsv(text: string): Pt[] {
  const lines = text.trim().split("\n");
  const head = lines[0].split(",");
  const idx = (c: string) => head.indexOf(c);
  const out: Pt[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    if (cells.length < head.length) continue;
    out.push({
      ID: cells[idx("ID")],
      location: cells[idx("location")],
      lat: Number(cells[idx("translated_lat")]),
      lon: Number(cells[idx("translated_lon")]),
      pred_ensemble: Number(cells[idx("pred_ensemble")]),
      pred_lgb: Number(cells[idx("pred_lgb")]),
      pred_cat: Number(cells[idx("pred_cat")]),
      pred_xgb: Number(cells[idx("pred_xgb")]),
      pred_tabpfn: Number(cells[idx("pred_tabpfn")]),
      agreement: Number(cells[idx("agreement")]),
    });
  }
  return out;
}

function predFor(mode: MapMode, p: Pt): number {
  if (mode === "lgb") return p.pred_lgb;
  if (mode === "cat") return p.pred_cat;
  if (mode === "xgb") return p.pred_xgb;
  if (mode === "tabpfn") return p.pred_tabpfn;
  return p.pred_ensemble;
}

function colorFor(mode: MapMode, p: Pt): string {
  if (mode === "agreement") {
    if (p.agreement === 5) return "green";
    if (p.agreement === 0) return "red";
    return "orange";
  }
  return predFor(mode, p) === 1 ? "green" : "red";
}

function drawPoints(L: LeafletNS, layer: LeafletNS, pts: Pt[], mode: MapMode) {
  layer.clearLayers();
  for (const p of pts) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    const c = colorFor(mode, p);
    const label =
      mode === "agreement" ? `agreement ${p.agreement}/5` : `${mode} pred=${predFor(mode, p)}`;
    const marker = L.circleMarker([p.lat, p.lon], {
      radius: 4,
      color: c,
      fillColor: c,
      fillOpacity: 0.7,
      weight: 1,
    });
    marker.bindPopup(
      `<b>${p.ID}</b><br/>${p.location}<br/>${label}<br/>agreement ${p.agreement}/5`
    );
    marker.addTo(layer);
  }
}

export default function MapView({ mode }: { mode: MapMode }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS>(null);
  const layerRef = useRef<LeafletNS>(null);
  const ptsRef = useRef<Pt[]>([]);
  const modeRef = useRef<MapMode>(mode);
  modeRef.current = mode;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const L: LeafletNS = await loadLeaflet();
      if (cancelled || !divRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(divRef.current).setView([46.5, 63.0], 4);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      if (ptsRef.current.length === 0) {
        // Data source: web/data/map_points.csv synced to public/data/map_points.csv
        // via `npm run sync-data` (600 pts: translated_lat/lon + pred_* + agreement).
        const res = await fetch("/data/map_points.csv");
        const text = await res.text();
        ptsRef.current = parseCsv(text);
      }
      if (!cancelled && layerRef.current) {
        drawPoints(L, layerRef.current, ptsRef.current, modeRef.current);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const w = window as unknown as { L?: LeafletNS };
    if (w.L && layerRef.current && ptsRef.current.length > 0) {
      drawPoints(w.L, layerRef.current, ptsRef.current, mode);
    }
  }, [mode]);

  return (
    <div
      ref={divRef}
      style={{ height: "480px", width: "100%", borderRadius: "0.75rem" }}
    />
  );
}
