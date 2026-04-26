"use client";

import { useState } from "react";

const TEST_BOUNDS = { swLat: 37.4, swLon: 126.8, neLat: 37.7, neLon: 127.2 };
const VWORLD = "https://api.vworld.kr/req/data";
const LAYERS = [
  { id: "LT_C_AISPRHC", type: "P", color: "#ff3b30" },
  { id: "LT_C_AISRESC", type: "R", color: "#ff9500" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = Record<string, any>;

type ClientResult = {
  ok: boolean;
  featureCount?: number;
  byType?: Record<string, number>;
  error?: string;
};

export default function TestAirspacePage() {
  const [debug, setDebug] = useState<AnyJson | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [clientResult, setClientResult] = useState<ClientResult | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  async function runDebug() {
    setDebugLoading(true);
    setDebug(null);
    try {
      const res = await fetch("/api/airspace-debug");
      setDebug(await res.json());
    } catch (e) {
      setDebug({ error: String(e) });
    } finally {
      setDebugLoading(false);
    }
  }

  async function runClientTest() {
    setClientLoading(true);
    setClientResult(null);
    const apiKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
    if (!apiKey) {
      setClientResult({ ok: false, error: "NEXT_PUBLIC_VWORLD_API_KEY 환경변수 없음" });
      setClientLoading(false);
      return;
    }
    const { swLat, swLon, neLat, neLon } = TEST_BOUNDS;
    const box = `BOX(${swLon},${swLat},${neLon},${neLat})`;
    try {
      const results = await Promise.all(
        LAYERS.map(async ({ id, type, color }) => {
          const url = new URL(VWORLD);
          url.searchParams.set("service", "data");
          url.searchParams.set("request", "GetFeature");
          url.searchParams.set("data", id);
          url.searchParams.set("key", apiKey);
          url.searchParams.set("format", "json");
          url.searchParams.set("size", "100");
          url.searchParams.set("geometry", "true");
          url.searchParams.set("attribute", "true");
          url.searchParams.set("crs", "EPSG:4326");
          url.searchParams.set("geomFilter", box);
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(`HTTP ${res.status} from ${id}`);
          const json = await res.json();
          if (json?.response?.status !== "OK") throw new Error(`V-World status: ${json?.response?.status} — ${JSON.stringify(json?.response?.error ?? "")}`);
          const features: GeoJSON.Feature[] = json?.response?.result?.featureCollection?.features ?? [];
          return features.map((f) => ({ ...f, properties: { ...f.properties, zoneType: type, color } }));
        })
      );
      const features = results.flat();
      const byType: Record<string, number> = {};
      features.forEach((f) => {
        const t = (f.properties?.zoneType as string) ?? "unknown";
        byType[t] = (byType[t] ?? 0) + 1;
      });
      setClientResult({ ok: true, featureCount: features.length, byType });
    } catch (e) {
      setClientResult({ ok: false, error: String(e) });
    } finally {
      setClientLoading(false);
    }
  }

  const btn = (label: string, loading: boolean, onClick: () => void, bg: string) => (
    <button onClick={onClick} disabled={loading} style={{
      padding: "0.6rem 1.4rem", background: loading ? "#999" : bg,
      color: "white", border: "none", borderRadius: 8,
      cursor: loading ? "not-allowed" : "pointer", fontSize: "0.9rem", marginRight: "0.75rem",
    }}>{loading ? "…" : label}</button>
  );

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 720 }}>
      <h1 style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>V-World Airspace API Test</h1>
      <p style={{ color: "#666", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
        서울 일대 BOX({TEST_BOUNDS.swLon},{TEST_BOUNDS.swLat} → {TEST_BOUNDS.neLon},{TEST_BOUNDS.neLat})
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {btn("브라우저→V-World 직접 테스트", clientLoading, runClientTest, "#16a34a")}
        {btn("서버→V-World 디버그", debugLoading, runDebug, "#636366")}
      </div>

      {clientResult && (
        <div style={{ marginBottom: "1rem", padding: "1rem", borderRadius: 8,
          background: clientResult.ok ? "#f0fdf4" : "#fff1f2",
          border: `1px solid ${clientResult.ok ? "#86efac" : "#fca5a5"}` }}>
          <div style={{ fontWeight: 700, color: clientResult.ok ? "#16a34a" : "#dc2626", marginBottom: "0.5rem" }}>
            브라우저 직접 호출: {clientResult.ok ? "✅ 성공" : "❌ 실패"}
          </div>
          {clientResult.ok ? (
            <>
              <div>전체 피처 수: <strong>{clientResult.featureCount}</strong></div>
              {Object.entries(clientResult.byType ?? {}).map(([t, c]) => (
                <div key={t} style={{ color: t === "P" ? "#dc2626" : "#ea580c" }}>
                  {t === "P" ? "비행금지(P)" : "비행제한(R)"}: {c}개
                </div>
              ))}
              {clientResult.featureCount === 0 && (
                <div style={{ color: "#b45309", marginTop: "0.4rem" }}>⚠️ 피처 0개</div>
              )}
            </>
          ) : (
            <div style={{ color: "#dc2626", fontSize: "0.85rem" }}>{clientResult.error}</div>
          )}
        </div>
      )}

      {debug && (
        <div style={{ padding: "1rem", borderRadius: 8, background: "#f5f5f7", border: "1px solid #d1d1d6" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>서버 디버그 응답</div>
          <pre style={{ fontSize: "0.72rem", overflow: "auto", maxHeight: 300, margin: 0 }}>
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
