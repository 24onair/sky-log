import { NextResponse } from "next/server";

// 국내 지명 검색 — 국토부 V-World 지명검색 API 프록시.
// Mapbox는 한국 지도 데이터 반출 규제로 국내 지명 커버리지가 빈약해 V-World로 대체.
// 서버에서 호출(CORS 회피 + 키 보관). type=place 가 지명·POI·동네까지 폭넓게 커버.
//
// 주의: V-World는 해외 IP(예: Vercel iad1=US)의 요청을 502로 막는다.
// 이 함수가 서울에서 실행돼야 동작하므로 vercel.json 의 regions=["icn1"] 로 고정한다.
export const dynamic = "force-dynamic";

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
  url.search = new URLSearchParams({
    service: "search",
    request: "search",
    version: "2.0",
    size: "7",
    page: "1",
    query: q,
    type: "place",
    format: "json",
    errorformat: "json",
    crs: "EPSG:4326",
    key,
  }).toString();

  try {
    const res = await fetch(url.toString());
    const data: { response?: { status?: string; result?: { items?: VWorldItem[] } } } =
      await res.json();
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
  } catch {
    return NextResponse.json({ results: [] });
  }
}
