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

export default function TestAirspacePage() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 640 }}>
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
