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
  const secsPerPoint = durationSec / Math.max(1, n - 1);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const rafRef = useRef<number>(0);
  // mutable playback state to avoid stale closures
  const psRef = useRef({ playing: false, speed: 4 as Speed, startRealMs: 0, startIndex: 0 });

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(4);
  const idxRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // RAF playback loop
  const tick = useCallback(
    (now: number) => {
      const ps = psRef.current;
      if (!ps.playing) return;
      const simElapsed = ((now - ps.startRealMs) / 1000) * ps.speed;
      const newIdx = Math.min(n - 1, ps.startIndex + Math.floor(simElapsed / secsPerPoint));
      idxRef.current = newIdx;
      setIdx(newIdx);
      if (newIdx < n - 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        psRef.current.playing = false;
        setPlaying(false);
      }
    },
    [n, secsPerPoint]
  );

  const togglePlay = useCallback(() => {
    if (psRef.current.playing) {
      cancelAnimationFrame(rafRef.current);
      psRef.current.playing = false;
      setPlaying(false);
    } else {
      const startIdx = idxRef.current >= n - 1 ? 0 : idxRef.current;
      if (startIdx === 0) { idxRef.current = 0; setIdx(0); }
      psRef.current = { playing: true, speed, startRealMs: performance.now(), startIndex: startIdx };
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [speed, n, tick]);

  const changeSpeed = useCallback(
    (s: Speed) => {
      setSpeed(s);
      psRef.current.speed = s;
      if (psRef.current.playing) {
        // Re-anchor timing so speed change is seamless
        psRef.current.startRealMs = performance.now();
        psRef.current.startIndex = idxRef.current;
      }
    },
    []
  );

  // Update map marker + progress line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || n === 0) return;
    const [lon, lat] = trackPoints[idx];
    markerRef.current?.setLngLat([lon, lat]);
    const src = map.getSource("progress") as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: trackPoints.slice(0, idx + 1).map(([lo, la]) => [lo, la]),
        },
      });
    }
  }, [idx, trackPoints, n]);

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
      // Full track (gray dashed)
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

      // Progress line (blue)
      map.addSource("progress", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [[trackPoints[0][0], trackPoints[0][1]]] },
        },
      });
      map.addLayer({
        id: "progress",
        type: "line",
        source: "progress",
        paint: { "line-color": "#0071e3", "line-width": 3 },
      });
    });

    // Glider marker
    const el = document.createElement("div");
    el.style.cssText = `
      width:14px;height:14px;
      background:#0071e3;border:2.5px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 10px rgba(0,113,227,0.6);
      z-index:10;
    `;
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([trackPoints[0][0], trackPoints[0][1]])
      .addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [trackPoints, n]);

  if (n === 0) return null;

  // Altitude profile SVG data
  const altitudes = trackPoints.map((p) => p[2]);
  const minAlt = Math.min(...altitudes);
  const maxAlt = Math.max(...altitudes);
  const altRange = Math.max(1, maxAlt - minAlt);

  const svgPts = altitudes.map((alt, i) => ({
    x: (i / Math.max(1, n - 1)) * 100,
    y: 88 - ((alt - minAlt) / altRange) * 76,
  }));

  const linePath = svgPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const fillPath = `${linePath} L100,95 L0,95 Z`;
  const progressX = (idx / Math.max(1, n - 1)) * 100;
  const cursorY = svgPts[idx]?.y ?? 50;

  const progressLinePath = svgPts
    .slice(0, idx + 1)
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const progressFillPath = idx > 0
    ? `${progressLinePath} L${progressX.toFixed(2)},95 L0,95 Z`
    : "";

  const handleScrub = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newIdx = Math.round(ratio * (n - 1));
    idxRef.current = newIdx;
    setIdx(newIdx);
    if (psRef.current.playing) {
      psRef.current.startRealMs = performance.now();
      psRef.current.startIndex = newIdx;
    }
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const currentTimeSec = Math.round(idx * secsPerPoint);

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
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          style={{
            width: 34, height: 34, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#0071e3", border: "none", borderRadius: 8,
            cursor: "pointer", color: "#fff",
          }}
          title={playing ? "일시정지" : "재생"}
        >
          {playing
            ? <svg width="13" height="13" viewBox="0 0 13 13" fill="white"><rect x="1.5" y="1.5" width="3.5" height="10" rx="1"/><rect x="8" y="1.5" width="3.5" height="10" rx="1"/></svg>
            : <svg width="13" height="13" viewBox="0 0 13 13" fill="white"><polygon points="2.5,1.5 11.5,6.5 2.5,11.5"/></svg>
          }
        </button>

        {/* Speed buttons */}
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

        {/* Time & altitude */}
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 12,
          fontSize: 12, fontVariantNumeric: "tabular-nums",
        }}>
          <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{fmtTime(currentTimeSec)}</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>{fmtTime(durationSec)}</span>
          <span style={{
            background: "rgba(240,185,11,0.12)", color: "#F0B90B",
            fontWeight: 700, padding: "3px 8px", borderRadius: 6, fontSize: 12,
          }}>
            {altitudes[idx] ?? 0} m
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
          {/* Background fill */}
          <path d={fillPath} fill="rgba(0,113,227,0.1)" />
          {/* Progress fill */}
          {progressFillPath && <path d={progressFillPath} fill="rgba(0,113,227,0.22)" />}
          {/* Full track line */}
          <path d={linePath} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.5" />
          {/* Progress line */}
          {idx > 0 && (
            <path d={progressLinePath} fill="none" stroke="#0071e3" strokeWidth="0.7" />
          )}
          {/* Cursor vertical line */}
          <line
            x1={progressX.toFixed(2)} y1="3"
            x2={progressX.toFixed(2)} y2="95"
            stroke="#0071e3" strokeWidth="0.5" opacity="0.7"
          />
          {/* Cursor dot */}
          <circle cx={progressX.toFixed(2)} cy={cursorY.toFixed(2)} r="1.6" fill="#0071e3" stroke="white" strokeWidth="0.4" />
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
