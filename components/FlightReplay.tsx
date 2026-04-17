"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";

type TrackPoint = [number, number, number]; // [lon, lat, alt]
const SPEEDS = [1, 4, 16, 32] as const;
type Speed = (typeof SPEEDS)[number];

interface FlightReplayProps {
  trackPoints: TrackPoint[];
  durationSec: number;
}

export function FlightReplay({ trackPoints, durationSec }: FlightReplayProps) {
  const n = trackPoints.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const rafRef = useRef<number>(0);
  const styleReadyRef = useRef(false);

  // Playback state — all mutable, no React re-renders in the hot loop
  const playRef = useRef({
    playing: false,
    speed: 4 as Speed,
    startRealMs: 0,
    startIndex: 0,
    currentIndex: 0,
  });

  // React state only for UI display (throttled to ~10fps)
  const [displayIdx, setDisplayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(4);
  const lastDisplayUpdateRef = useRef(0);

  // SVG cursor refs for imperative DOM updates
  const cursorLineRef = useRef<SVGLineElement>(null);
  const cursorDotRef = useRef<SVGCircleElement>(null);
  const progressLineRef = useRef<SVGPathElement>(null);
  const progressFillRef = useRef<SVGPathElement>(null);

  const secsPerPoint = durationSec / Math.max(1, n - 1);

  // Pre-compute SVG points once
  const altitudes = trackPoints.map((p) => p[2]);
  const minAlt = n > 0 ? Math.min(...altitudes) : 0;
  const maxAlt = n > 0 ? Math.max(...altitudes) : 0;
  const altRange = Math.max(1, maxAlt - minAlt);
  const svgPts = altitudes.map((alt, i) => ({
    x: (i / Math.max(1, n - 1)) * 100,
    y: 88 - ((alt - minAlt) / altRange) * 76,
  }));
  const fullLinePath = svgPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const fullFillPath = `${fullLinePath} L100,95 L0,95 Z`;

  // Update everything for a given index — called from RAF (no setState)
  const applyIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(n - 1, idx));

      // Map marker
      const [lon, lat] = trackPoints[clamped];
      markerRef.current?.setLngLat([lon, lat]);

      // Mapbox progress line (requires ≥2 coords)
      if (clamped >= 1 && styleReadyRef.current) {
        const src = mapRef.current?.getSource("progress") as mapboxgl.GeoJSONSource | undefined;
        src?.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: trackPoints.slice(0, clamped + 1).map(([lo, la]) => [lo, la]),
          },
        });
      }

      // SVG cursor — imperative DOM update (zero React renders)
      const px = svgPts[clamped]?.x ?? 0;
      const py = svgPts[clamped]?.y ?? 50;
      if (cursorLineRef.current) {
        cursorLineRef.current.setAttribute("x1", px.toFixed(2));
        cursorLineRef.current.setAttribute("x2", px.toFixed(2));
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.setAttribute("cx", px.toFixed(2));
        cursorDotRef.current.setAttribute("cy", py.toFixed(2));
      }

      // SVG progress line + fill
      if (clamped >= 1) {
        const path = svgPts
          .slice(0, clamped + 1)
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
          .join(" ");
        progressLineRef.current?.setAttribute("d", path);
        progressFillRef.current?.setAttribute("d", `${path} L${px.toFixed(2)},95 L0,95 Z`);
      }

      // Throttled React state update for time/altitude display (~10fps)
      const now = performance.now();
      if (now - lastDisplayUpdateRef.current > 100) {
        lastDisplayUpdateRef.current = now;
        setDisplayIdx(clamped);
      }
    },
    [n, trackPoints, svgPts]
  );

  // RAF loop — only mutates refs + DOM, no setState
  const tick = useCallback(
    (now: number) => {
      const ps = playRef.current;
      if (!ps.playing) return;

      const simElapsed = ((now - ps.startRealMs) / 1000) * ps.speed;
      const rawIdx = ps.startIndex + Math.floor(simElapsed / Math.max(0.001, secsPerPoint));
      const newIdx = Math.min(n - 1, rawIdx);

      if (newIdx !== ps.currentIndex) {
        ps.currentIndex = newIdx;
        applyIndex(newIdx);
      }

      if (newIdx < n - 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ps.playing = false;
        setPlaying(false);
        setDisplayIdx(n - 1);
      }
    },
    [n, secsPerPoint, applyIndex]
  );

  const togglePlay = useCallback(() => {
    const ps = playRef.current;
    if (ps.playing) {
      cancelAnimationFrame(rafRef.current);
      ps.playing = false;
      setPlaying(false);
    } else {
      const startIdx = ps.currentIndex >= n - 1 ? 0 : ps.currentIndex;
      if (startIdx === 0) {
        ps.currentIndex = 0;
        applyIndex(0);
        setDisplayIdx(0);
      }
      ps.playing = true;
      ps.startRealMs = performance.now();
      ps.startIndex = startIdx;
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [n, tick, applyIndex]);

  const changeSpeed = useCallback((s: Speed) => {
    setSpeed(s);
    playRef.current.speed = s;
    if (playRef.current.playing) {
      playRef.current.startRealMs = performance.now();
      playRef.current.startIndex = playRef.current.currentIndex;
    }
  }, []);

  const handleScrub = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newIdx = Math.round(ratio * (n - 1));
      playRef.current.currentIndex = newIdx;
      applyIndex(newIdx);
      setDisplayIdx(newIdx);
      if (playRef.current.playing) {
        playRef.current.startRealMs = performance.now();
        playRef.current.startIndex = newIdx;
      }
    },
    [n, applyIndex]
  );

  // Cleanup
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Init Mapbox
  useEffect(() => {
    if (!containerRef.current || mapRef.current || n === 0) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const bounds = trackPoints.reduce(
      (b, [lo, la]) => b.extend([lo, la] as [number, number]),
      new mapboxgl.LngLatBounds(
        [trackPoints[0][0], trackPoints[0][1]],
        [trackPoints[0][0], trackPoints[0][1]]
      )
    );

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      bounds,
      fitBoundsOptions: { padding: 60, maxZoom: 13 },
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      styleReadyRef.current = true;

      map.addSource("track", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: trackPoints.map(([lo, la]) => [lo, la]),
          },
        },
      });
      map.addLayer({
        id: "track",
        type: "line",
        source: "track",
        paint: { "line-color": "rgba(0,0,0,0.18)", "line-width": 2, "line-dasharray": [3, 2] },
      });

      // Progress line — initialised with 2 identical points (valid LineString)
      map.addSource("progress", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [trackPoints[0][0], trackPoints[0][1]],
              [trackPoints[0][0], trackPoints[0][1]],
            ],
          },
        },
      });
      map.addLayer({
        id: "progress",
        type: "line",
        source: "progress",
        paint: { "line-color": "#0071e3", "line-width": 3 },
      });
    });

    const el = document.createElement("div");
    el.style.cssText = `
      width:14px;height:14px;
      background:#0071e3;border:2.5px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 10px rgba(0,113,227,0.6);
    `;
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([trackPoints[0][0], trackPoints[0][1]])
      .addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    return () => {
      styleReadyRef.current = false;
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [trackPoints, n]);

  if (n === 0) return null;

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const currentTimeSec = Math.round(displayIdx * secsPerPoint);

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", background: "#1E2026" }}>
      {/* Map */}
      <div ref={containerRef} style={{ width: "100%", height: 420 }} />

      {/* Playback controls */}
      <div style={{
        background: "#1E2026",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        <button
          onClick={togglePlay}
          style={{
            width: 34, height: 34, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#0071e3", border: "none", borderRadius: 8,
            cursor: "pointer",
          }}
          title={playing ? "일시정지" : "재생"}
        >
          {playing
            ? <svg width="13" height="13" viewBox="0 0 13 13" fill="white"><rect x="1.5" y="1.5" width="3.5" height="10" rx="1"/><rect x="8" y="1.5" width="3.5" height="10" rx="1"/></svg>
            : <svg width="13" height="13" viewBox="0 0 13 13" fill="white"><polygon points="2.5,1.5 11.5,6.5 2.5,11.5"/></svg>
          }
        </button>

        <div style={{ display: "flex", gap: 4 }}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              style={{
                padding: "4px 9px", fontSize: 12, fontWeight: 600,
                background: speed === s ? "rgba(0,113,227,0.22)" : "rgba(255,255,255,0.06)",
                color: speed === s ? "#4DA3FF" : "rgba(255,255,255,0.4)",
                border: `1px solid ${speed === s ? "rgba(0,113,227,0.4)" : "transparent"}`,
                borderRadius: 6, cursor: "pointer",
              }}
            >
              {s}×
            </button>
          ))}
        </div>

        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 12,
          fontSize: 12, fontVariantNumeric: "tabular-nums",
        }}>
          <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{fmtTime(currentTimeSec)}</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>{fmtTime(durationSec)}</span>
          <span style={{
            background: "rgba(240,185,11,0.12)", color: "#F0B90B",
            fontWeight: 700, padding: "3px 8px", borderRadius: 6,
          }}>
            {altitudes[displayIdx] ?? 0} m
          </span>
        </div>
      </div>

      {/* Altitude profile */}
      <div style={{ background: "#16181D" }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: "100%", height: 80, display: "block", cursor: "col-resize" }}
          onClick={handleScrub}
        >
          {/* Static background fill */}
          <path d={fullFillPath} fill="rgba(0,113,227,0.1)" />
          {/* Static full track line */}
          <path d={fullLinePath} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.5" />
          {/* Progress fill — updated imperatively */}
          <path ref={progressFillRef} d="" fill="rgba(0,113,227,0.22)" />
          {/* Progress line — updated imperatively */}
          <path ref={progressLineRef} d="" fill="none" stroke="#0071e3" strokeWidth="0.7" />
          {/* Cursor line — updated imperatively */}
          <line ref={cursorLineRef} x1="0" y1="3" x2="0" y2="95" stroke="#0071e3" strokeWidth="0.5" opacity="0.7" />
          {/* Cursor dot — updated imperatively */}
          <circle ref={cursorDotRef} cx="0" cy="50" r="1.6" fill="#0071e3" stroke="white" strokeWidth="0.4" />
        </svg>
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "2px 10px 8px",
          fontSize: 10, color: "rgba(255,255,255,0.28)",
        }}>
          <span>{minAlt} m</span>
          <span style={{ color: "rgba(255,255,255,0.18)" }}>고도 프로파일</span>
          <span>{maxAlt} m</span>
        </div>
      </div>
    </div>
  );
}
