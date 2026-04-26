"use client";

import { useState } from "react";

const TEST_BOUNDS = {
  swLat: 37.4,
  swLon: 126.8,
  neLat: 37.7,
  neLon: 127.2,
};

type Result = {
  ok: boolean;
  status?: number;
  featureCount?: number;
  byType?: Record<string, number>;
  error?: string;
  raw?: unknown;
};

type DebugResult = unknown;

export default function TestAirspacePage() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<DebugResult | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const { swLat, swLon, neLat, neLon } = TEST_BOUNDS;
      const res = await fetch(
        `/api/airspace?swLat=${swLat}&swLon=${swLon}&neLat=${neLat}&neLon=${neLon}`
      );
      const data = await res.json();

      if (!res.ok) {
        setResult({ ok: false, status: res.status, error: JSON.stringify(data) });
        return;
      }

      const features: { properties?: { zoneType?: string } }[] = data.features ?? [];
      const byType: Record<string, number> = {};
      features.forEach((f) => {
        const t = f.properties?.zoneType ?? "unknown";
        byType[t] = (byType[t] ?? 0) + 1;
      });

      setResult({ ok: true, status: res.status, featureCount: features.length, byType, raw: data });
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function runDebug() {
    setDebugLoading(true);
    setDebug(null);
    try {
      const res = await fetch("/api/airspace-debug");
      const data = await res.json();
      setDebug(data);
    } catch (e) {
      setDebug({ error: String(e) });
    } finally {
      setDebugLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 720 }}>
      <h1 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>V-World Airspace API Test</h1>
      <p style={{ color: "#666", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        테스트 범위: 서울 일대 ({TEST_BOUNDS.swLat},{TEST_BOUNDS.swLon} → {TEST_BOUNDS.neLat},{TEST_BOUNDS.neLon})
      </p>

      <button
        onClick={runTest}
        disabled={loading}
        style={{
          padding: "0.6rem 1.4rem",
          background: loading ? "#999" : "#0071e3",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "0.95rem",
        }}
      >
        {loading ? "요청 중…" : "API 테스트 실행"}
      </button>

      <button
        onClick={runDebug}
        disabled={debugLoading}
        style={{
          marginLeft: "0.75rem",
          padding: "0.6rem 1.4rem",
          background: debugLoading ? "#999" : "#636366",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: debugLoading ? "not-allowed" : "pointer",
          fontSize: "0.95rem",
        }}
      >
        {debugLoading ? "확인 중…" : "V-World 원본 응답 확인"}
      </button>

      {debug && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: 8, background: "#f5f5f7", border: "1px solid #d1d1d6" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>V-World 원본 응답</div>
          <pre style={{ fontSize: "0.75rem", overflow: "auto", maxHeight: 400, margin: 0 }}>
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderRadius: 8,
            background: result.ok ? "#f0fdf4" : "#fff1f2",
            border: `1px solid ${result.ok ? "#86efac" : "#fca5a5"}`,
          }}
        >
          <div style={{ fontWeight: 700, color: result.ok ? "#16a34a" : "#dc2626", marginBottom: "0.5rem" }}>
            {result.ok ? "✅ 성공" : "❌ 실패"} (HTTP {result.status ?? "N/A"})
          </div>

          {result.ok ? (
            <>
              <div>전체 피처 수: <strong>{result.featureCount}</strong></div>
              {Object.entries(result.byType ?? {}).map(([type, count]) => (
                <div key={type} style={{ color: type === "P" ? "#dc2626" : "#ea580c" }}>
                  {type === "P" ? "비행금지(P)" : type === "R" ? "비행제한(R)" : type}: {count}개
                </div>
              ))}
              {result.featureCount === 0 && (
                <div style={{ color: "#b45309", marginTop: "0.5rem" }}>
                  ⚠️ 피처 0개 — API 키가 이 도메인에서 차단됐거나 해당 구역에 데이터가 없을 수 있습니다.
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#dc2626" }}>{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
