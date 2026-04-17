"use client";

import { useState, useEffect, useRef } from "react";
import { Waypoint } from "@/lib/schemas/task";
import { waypointRoleColor } from "@/lib/utils/taskUtils";

const PROFILE_H = 130;

// ── Geometry ─────────────────────────────────────────────────────────────────

function hkm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface SP { lat: number; lon: number; dist: number; }
interface EP { dist: number; alt: number; }

function sampleRoute(wps: Waypoint[], n = 80): { pts: SP[]; wpDists: number[] } {
  const legs = wps.slice(1).map((w, i) => hkm(wps[i].lat, wps[i].lon, w.lat, w.lon));
  const total = legs.reduce((a, b) => a + b, 0);
  if (!total) return { pts: [], wpDists: [] };

  const wpDists: number[] = [0];
  legs.forEach((d, i) => wpDists.push(wpDists[i] + d));

  const step = total / (n - 1);
  const pts: SP[] = [];
  for (let s = 0; s < n; s++) {
    const target = Math.min(s * step, total);
    let cum = 0;
    for (let i = 0; i < legs.length; i++) {
      if (target <= cum + legs[i] + 1e-9 || i === legs.length - 1) {
        const t = legs[i] > 0 ? Math.max(0, Math.min(1, (target - cum) / legs[i])) : 0;
        pts.push({
          lat: wps[i].lat + (wps[i + 1].lat - wps[i].lat) * t,
          lon: wps[i].lon + (wps[i + 1].lon - wps[i].lon) * t,
          dist: target,
        });
        break;
      }
      cum += legs[i];
    }
  }
  return { pts, wpDists };
}

async function fetchElev(pts: SP[]): Promise<number[]> {
  const locs = pts.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join("|");
  // Use internal proxy to avoid CORS issues
  const r = await fetch("/api/elevation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations: locs }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (d.status !== "OK") throw new Error(d.error || "API error");
  return (d.results as { elevation: number | null }[]).map(x => x.elevation ?? 0);
}

function altAt(pts: EP[], dist: number): number {
  if (!pts.length) return 0;
  let lo = pts[0], hi = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i + 1].dist >= dist) { lo = pts[i]; hi = pts[i + 1]; break; }
  }
  const t = hi.dist > lo.dist ? (dist - lo.dist) / (hi.dist - lo.dist) : 0;
  return lo.alt + (hi.alt - lo.alt) * t;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskElevationProfile({ waypoints }: { waypoints: Waypoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [elevPts, setElevPts] = useState<EP[]>([]);
  const [wpDists, setWpDists] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [cursor, setCursor] = useState<{ x: number; alt: number; dist: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wpKey = waypoints.map(w => `${w.lat.toFixed(5)},${w.lon.toFixed(5)}`).join("|");
  useEffect(() => {
    if (waypoints.length < 2) return;
    let cancelled = false;
    setStatus("loading");
    setElevPts([]);
    const { pts: samples, wpDists: wd } = sampleRoute(waypoints);
    setWpDists(wd);
    fetchElev(samples)
      .then(alts => {
        if (cancelled) return;
        setElevPts(samples.map((s, i) => ({ dist: s.dist, alt: alts[i] })));
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpKey]);

  if (waypoints.length < 2) return null;

  const w = width;
  const h = PROFILE_H;
  const PL = 40, PR = 8, PT = 20, PB = 22;
  const CW = Math.max(1, w - PL - PR);
  const CH = Math.max(1, h - PT - PB);
  const n = waypoints.length;
  const totalDist = wpDists[wpDists.length - 1] || 1;

  const alts = elevPts.map(p => p.alt);
  const minA = alts.length ? Math.min(...alts) : 0;
  const maxA = alts.length ? Math.max(...alts) : 1;
  const range = Math.max(maxA - minA, 1);

  const toX = (d: number) => PL + (d / totalDist) * CW;
  const toY = (a: number) => PT + (1 - (a - minA) / range) * CH;

  const linePts = elevPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.dist).toFixed(1)},${toY(p.alt).toFixed(1)}`)
    .join(" ");
  const areaD = elevPts.length
    ? `${linePts} L${toX(totalDist).toFixed(1)},${h - PB} L${PL},${h - PB} Z`
    : "";

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || elevPts.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dist = Math.max(0, Math.min(totalDist, ((x - PL) / CW) * totalDist));
    setCursor({ x, alt: Math.round(altAt(elevPts, dist)), dist });
  };

  const yTicks = [minA, minA + range / 2, maxA];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCursor(null)}
      style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: h,
        background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.50) 55%, transparent 100%)",
        cursor: elevPts.length ? "crosshair" : "default",
        userSelect: "none",
        overflow: "hidden",
        zIndex: 50,   // above Mapbox canvas
        pointerEvents: "auto",
      }}
    >
      <style>{`@keyframes elSpin { to { transform: rotate(360deg); } }`}</style>

      {/* Status label — always visible so we can confirm rendering */}
      {status === "loading" && (
        <div style={{ position: "absolute", bottom: 8, right: 14, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, border: "1.5px solid rgba(255,255,255,0.2)", borderTopColor: "#F0B90B", borderRadius: "50%", animation: "elSpin 0.8s linear infinite" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "-apple-system,sans-serif" }}>고도 로딩 중…</span>
        </div>
      )}
      {status === "error" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,100,100,0.6)", fontFamily: "-apple-system,sans-serif" }}>고도 데이터를 불러올 수 없습니다</span>
        </div>
      )}

      {elevPts.length > 0 && (
        <svg width={w} height={h} style={{ display: "block" }}>
          <defs>
            <linearGradient id="tElevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0B90B" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <path d={areaD} fill="url(#tElevGrad)" />
          <path d={linePts} fill="none" stroke="#F0B90B" strokeWidth="1.5" />

          {wpDists.map((d, i) => {
            const cx = toX(d);
            const cy = toY(altAt(elevPts, d));
            return (
              <g key={i}>
                <line x1={cx} y1={PT} x2={cx} y2={h - PB}
                  stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3,2" />
                <circle cx={cx} cy={cy} r="3"
                  fill={waypointRoleColor(i, n)} stroke="white" strokeWidth="1.5" />
              </g>
            );
          })}

          {yTicks.map((a, i) => (
            <text key={i} x={PL - 5} y={toY(a) + 3.5}
              textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.55)"
              fontFamily="-apple-system,sans-serif">
              {Math.round(a)}m
            </text>
          ))}

          {cursor && (() => {
            const cy = toY(cursor.alt);
            const flip = cursor.x + 6 > w - 55;
            return (
              <>
                <line x1={cursor.x} y1={PT} x2={cursor.x} y2={h - PB}
                  stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
                <circle cx={cursor.x} cy={cy} r="4"
                  fill="#F0B90B" stroke="white" strokeWidth="1.5" />
                <text
                  x={flip ? cursor.x - 6 : cursor.x + 6}
                  y={cy - 6}
                  textAnchor={flip ? "end" : "start"}
                  fontSize="11" fontWeight="700" fill="white"
                  fontFamily="-apple-system,sans-serif">
                  {cursor.alt}m
                </text>
                <text x={cursor.x} y={h - PB + 14} textAnchor="middle"
                  fontSize="9" fill="rgba(255,255,255,0.55)"
                  fontFamily="-apple-system,sans-serif">
                  {cursor.dist.toFixed(1)}km
                </text>
              </>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
