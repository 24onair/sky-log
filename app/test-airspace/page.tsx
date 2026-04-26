"use client";

import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TEST_BOUNDS = { swLat: 37.4, swLon: 126.8, neLat: 37.7, neLon: 127.2 };
const VWORLD = "https://api.vworld.kr/req/data";
const LAYERS = [
  { id: "LT_C_AISPRHC", type: "P", color: "#ff3b30" },
  { id: "LT_C_AISRESC", type: "R", color: "#ff9500" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = Record<string, any>;

type ClientResult = { ok: boolean; featureCount?: number; byType?: Record<string, number>; error?: string };
type WmsStatus = "idle" | "loading" | "ok" | "error";
type StaticStatus = "idle" | "loading" | "ok" | "error";

export default function TestAirspacePage() {
  // ── ① 정적 GeoJSON 지도 테스트 ───────────────────────────────
  const staticMapRef = useRef<HTMLDivElement>(null);
  const staticMapObjRef = useRef<mapboxgl.Map | null>(null);
  const [staticStatus, setStaticStatus] = useState<StaticStatus>("idle");
  const [staticInfo, setStaticInfo] = useState<{ total: number; byType: Record<string, number> } | null>(null);
  const [staticError, setStaticError] = useState<string | null>(null);

  // ── ② client-side data API test ──────────────────────────────
  const [clientResult, setClientResult] = useState<ClientResult | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  // ── ③ server-side debug ───────────────────────────────────────
  const [debug, setDebug] = useState<AnyJson | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // ── ④ WMS map test ────────────────────────────────────────────
  const wmsMapRef = useRef<HTMLDivElement>(null);
  const wmsMapObjRef = useRef<mapboxgl.Map | null>(null);
  const [wmsStatus, setWmsStatus] = useState<WmsStatus>("idle");
  const [wmsError, setWmsError] = useState<string | null>(null);

  // ── 정적 GeoJSON 지도 초기화 ──────────────────────────────────
  useEffect(() => {
    if (!staticMapRef.current || staticMapObjRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: staticMapRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [128.0, 36.5],
      zoom: 6,
      attributionControl: false,
    });

    map.on("load", async () => {
      setStaticStatus("loading");
      try {
        const res = await fetch("/airspace-korea.geojson");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const geojson: GeoJSON.FeatureCollection = await res.json();

        const byType: Record<string, number> = {};
        geojson.features.forEach((f) => {
          const t = (f.properties?.zoneType as string) ?? "?";
          byType[t] = (byType[t] ?? 0) + 1;
        });
        setStaticInfo({ total: geojson.features.length, byType });

        map.addSource("airspace", { type: "geojson", data: geojson });
        map.addLayer({
          id: "airspace-fill",
          type: "fill",
          source: "airspace",
          paint: {
            "fill-color": [
              "match", ["get", "zoneType"],
              "P", "#ff3b30",
              "R", "#ff9500",
              "#636366",
            ],
            "fill-opacity": 0.25,
          },
        });
        map.addLayer({
          id: "airspace-outline",
          type: "line",
          source: "airspace",
          paint: {
            "line-color": [
              "match", ["get", "zoneType"],
              "P", "#ff3b30",
              "R", "#ff9500",
              "#636366",
            ],
            "line-width": 1.5,
            "line-opacity": 0.8,
          },
        });

        // Popup on hover
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
        map.on("mouseenter", "airspace-fill", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties ?? {};
          const name = p.prh_lbl_1 ?? p.res_lbl_1 ?? "?";
          const type = p.zoneType === "P" ? "비행금지" : "비행제한";
          popup.setLngLat(e.lngLat).setHTML(`<b>${name}</b><br/>${type}`).addTo(map);
        });
        map.on("mouseleave", "airspace-fill", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });

        setStaticStatus("ok");
      } catch (e) {
        setStaticStatus("error");
        setStaticError(String(e));
      }
    });

    staticMapObjRef.current = map;
    return () => { map.remove(); staticMapObjRef.current = null; };
  }, []);

  // ── WMS 지도 초기화 ───────────────────────────────────────────
  useEffect(() => {
    if (!wmsMapRef.current || wmsMapObjRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const apiKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
    if (!token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: wmsMapRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [126.98, 37.55],
      zoom: 9,
      attributionControl: false,
    });

    map.on("load", () => {
      if (!apiKey) {
        setWmsStatus("error");
        setWmsError("NEXT_PUBLIC_VWORLD_API_KEY 환경변수 없음");
        return;
      }

      setWmsStatus("loading");

      const wmsUrl =
        `https://api.vworld.kr/req/wms?service=WMS&request=GetMap&version=1.3.0` +
        `&layers=LT_C_AISPRHC,LT_C_AISRESC&styles=&format=image/png&transparent=true` +
        `&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}&key=${apiKey}`;

      map.addSource("vworld-wms", { type: "raster", tiles: [wmsUrl], tileSize: 256 });
      map.addLayer({ id: "vworld-wms", type: "raster", source: "vworld-wms", paint: { "raster-opacity": 0.7 } });

      map.on("error", (e) => {
        setWmsStatus("error");
        setWmsError(String(e.error?.message ?? "타일 로드 실패"));
      });

      map.on("sourcedata", (e) => {
        if (e.sourceId === "vworld-wms" && e.isSourceLoaded) {
          setWmsStatus("ok");
        }
      });
    });

    wmsMapObjRef.current = map;
    return () => { map.remove(); wmsMapObjRef.current = null; };
  }, []);

  async function runClientTest() {
    setClientLoading(true);
    setClientResult(null);
    const apiKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
    if (!apiKey) { setClientResult({ ok: false, error: "NEXT_PUBLIC_VWORLD_API_KEY 없음" }); setClientLoading(false); return; }
    const { swLat, swLon, neLat, neLon } = TEST_BOUNDS;
    const box = `BOX(${swLon},${swLat},${neLon},${neLat})`;
    try {
      const results = await Promise.all(
        LAYERS.map(async ({ id, type, color }) => {
          const url = new URL(VWORLD);
          url.searchParams.set("service", "data"); url.searchParams.set("request", "GetFeature");
          url.searchParams.set("data", id); url.searchParams.set("key", apiKey);
          url.searchParams.set("format", "json"); url.searchParams.set("size", "100");
          url.searchParams.set("geometry", "true"); url.searchParams.set("attribute", "true");
          url.searchParams.set("crs", "EPSG:4326"); url.searchParams.set("geomFilter", box);
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          if (json?.response?.status !== "OK") throw new Error(`V-World: ${json?.response?.status} ${JSON.stringify(json?.response?.error ?? "")}`);
          const features: GeoJSON.Feature[] = json?.response?.result?.featureCollection?.features ?? [];
          return features.map((f) => ({ ...f, properties: { ...f.properties, zoneType: type, color } }));
        })
      );
      const features = results.flat();
      const byType: Record<string, number> = {};
      features.forEach((f) => { const t = (f.properties?.zoneType as string) ?? "?"; byType[t] = (byType[t] ?? 0) + 1; });
      setClientResult({ ok: true, featureCount: features.length, byType });
    } catch (e) { setClientResult({ ok: false, error: String(e) }); }
    finally { setClientLoading(false); }
  }

  async function runDebug() {
    setDebugLoading(true); setDebug(null);
    try { const res = await fetch("/api/airspace-debug"); setDebug(await res.json()); }
    catch (e) { setDebug({ error: String(e) }); }
    finally { setDebugLoading(false); }
  }

  const staticColor = staticStatus === "ok" ? "#16a34a" : staticStatus === "error" ? "#dc2626" : staticStatus === "loading" ? "#b45309" : "#636366";
  const staticLabel = staticStatus === "ok"
    ? `✅ 로드 성공 — ${staticInfo?.total}개 (금지 ${staticInfo?.byType?.P ?? 0} / 제한 ${staticInfo?.byType?.R ?? 0})`
    : staticStatus === "error" ? `❌ 실패: ${staticError}`
    : staticStatus === "loading" ? "⏳ 로딩 중…" : "지도 초기화 중…";

  const wmsColor = wmsStatus === "ok" ? "#16a34a" : wmsStatus === "error" ? "#dc2626" : wmsStatus === "loading" ? "#b45309" : "#636366";
  const wmsLabel = wmsStatus === "ok" ? "✅ 타일 로드 성공" : wmsStatus === "error" ? `❌ 실패: ${wmsError}` : wmsStatus === "loading" ? "⏳ 타일 로딩 중…" : "지도 초기화 중…";

  const btn = (label: string, loading: boolean, onClick: () => void, bg: string) => (
    <button onClick={onClick} disabled={loading} style={{
      padding: "0.55rem 1.2rem", background: loading ? "#999" : bg, color: "white",
      border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
      fontSize: "0.88rem", marginRight: "0.6rem",
    }}>{loading ? "…" : label}</button>
  );

  return (
    <div style={{ fontFamily: "monospace", padding: "1.5rem", maxWidth: 760 }}>
      <h1 style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>V-World Airspace API Test</h1>

      {/* ── ① 정적 GeoJSON 지도 ── */}
      <section style={{ marginBottom: "1.8rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>① 정적 GeoJSON 지도 (로컬 파일)</div>
        <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.6rem" }}>
          scripts/fetch-airspace.mjs 로 다운받은 /public/airspace-korea.geojson 로드 — CORS·IP 무관
        </div>
        <div style={{ fontSize: "0.85rem", color: staticColor, marginBottom: "0.5rem", fontWeight: 600 }}>{staticLabel}</div>
        <div ref={staticMapRef} style={{ width: "100%", height: 340, borderRadius: 10, overflow: "hidden", border: "1px solid #d1d1d6" }} />
        <div style={{ fontSize: "0.75rem", color: "#636366", marginTop: "0.4rem" }}>
          ▲ 빨간색 = 비행금지(P) · 주황색 = 비행제한(R) · 마커 위에 마우스를 올리면 구역명 표시
        </div>
      </section>

      {/* ── ② WMS 지도 테스트 ── */}
      <section style={{ marginBottom: "1.8rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>② WMS 타일 지도 테스트 (V-World 실시간)</div>
        <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.6rem" }}>
          Mapbox가 V-World WMS 타일을 이미지로 직접 로드 — CORS 차단으로 실패 예상
        </div>
        <div style={{ fontSize: "0.85rem", color: wmsColor, marginBottom: "0.5rem", fontWeight: 600 }}>{wmsLabel}</div>
        <div ref={wmsMapRef} style={{ width: "100%", height: 340, borderRadius: 10, overflow: "hidden", border: "1px solid #d1d1d6" }} />
      </section>

      {/* ── ③ 데이터 API 직접 호출 ── */}
      <section style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>③ 브라우저→V-World 데이터 API (fetch)</div>
        {btn("테스트 실행", clientLoading, runClientTest, "#0071e3")}
        {clientResult && (
          <div style={{ marginTop: "0.6rem", padding: "0.75rem", borderRadius: 8,
            background: clientResult.ok ? "#f0fdf4" : "#fff1f2",
            border: `1px solid ${clientResult.ok ? "#86efac" : "#fca5a5"}` }}>
            {clientResult.ok
              ? <>
                  <div style={{ color: "#16a34a", fontWeight: 700 }}>✅ 성공 — 피처 {clientResult.featureCount}개</div>
                  {Object.entries(clientResult.byType ?? {}).map(([t, c]) => (
                    <div key={t} style={{ color: t === "P" ? "#dc2626" : "#ea580c" }}>{t === "P" ? "비행금지(P)" : "비행제한(R)"}: {c}개</div>
                  ))}
                </>
              : <div style={{ color: "#dc2626" }}>❌ {clientResult.error}</div>}
          </div>
        )}
      </section>

      {/* ── ④ 서버 디버그 ── */}
      <section>
        <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>④ 서버→V-World 디버그</div>
        {btn("서버 응답 확인", debugLoading, runDebug, "#636366")}
        {debug && (
          <div style={{ marginTop: "0.6rem", padding: "0.75rem", borderRadius: 8, background: "#f5f5f7", border: "1px solid #d1d1d6" }}>
            <pre style={{ fontSize: "0.72rem", overflow: "auto", maxHeight: 200, margin: 0 }}>
              {JSON.stringify(debug, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
