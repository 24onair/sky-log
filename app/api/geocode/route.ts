import { NextResponse } from "next/server";

// V-World(국토부)는 해외 IP를 차단(502)하므로 이 라우트는 반드시 서울 리전에서 실행한다.
// (기본 리전 iad1=US 에서 호출하면 V-World가 502 Bad Gateway 반환)
export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

// 국내 지명 검색 — 국토부 V-World 지명검색 API 프록시.
// Mapbox는 한국 지도 데이터 반출 규제로 국내 지명 커버리지가 빈약해 V-World로 대체.
// 서버에서 호출(CORS 회피 + 키 보관). type=place 가 지명·POI·동네까지 폭넓게 커버.
const VWORLD_SEARCH = "https://api.vworld.kr/req/search";

interface VWorldItem {
  id: string;
  title: string;
  address?: { road?: string; parcel?: string };
  point: { x: string; y: string }; // x=경도, y=위도
}

export interface GeoResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lon, lat]
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const key = process.env.VWORLD_API_KEY ?? process.env.NEXT_PUBLIC_VWORLD_API_KEY;
  if (!key) {
    return NextResponse.json({ results: [], error: "VWORLD key missing" }, { status: 500 });
  }

  const url = new URL(VWORLD_SEARCH);
  url.searchParams.set("service", "search");
  url.searchParams.set("request", "search");
  url.searchParams.set("version", "2.0");
  url.searchParams.set("size", "7");
  url.searchParams.set("page", "1");
  url.searchParams.set("query", q);
  url.searchParams.set("type", "place");
  url.searchParams.set("format", "json");
  url.searchParams.set("errorformat", "json");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("key", key);

  const debug = new URL(req.url).searchParams.get("debug") === "1";

  try {
    const res = await fetch(url.toString());
    const raw = await res.text();
    let data: { response?: { status?: string; error?: unknown; result?: { items?: VWorldItem[] } } } = {};
    try { data = JSON.parse(raw); } catch { /* non-JSON upstream */ }

    if (debug) {
      return NextResponse.json({
        keyUsed: process.env.VWORLD_API_KEY ? "VWORLD_API_KEY" : "NEXT_PUBLIC_VWORLD_API_KEY",
        upstreamHttp: res.status,
        vworldStatus: data?.response?.status ?? null,
        vworldError: data?.response?.error ?? null,
        rawSnippet: raw.slice(0, 300),
      });
    }

    const items: VWorldItem[] =
      data?.response?.status === "OK" ? data.response.result?.items ?? [] : [];

    const results: GeoResult[] = items
      .map((it) => {
        const addr = it.address?.road || it.address?.parcel || "";
        return {
          id: it.id,
          place_name: addr ? `${it.title}, ${addr}` : it.title,
          center: [parseFloat(it.point.x), parseFloat(it.point.y)] as [number, number],
        };
      })
      .filter((r) => Number.isFinite(r.center[0]) && Number.isFinite(r.center[1]));

    return NextResponse.json({ results });
  } catch (e) {
    if (debug) {
      return NextResponse.json({ caught: true, message: e instanceof Error ? e.message : String(e) });
    }
    return NextResponse.json({ results: [] });
  }
}
