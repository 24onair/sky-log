import { NextRequest, NextResponse } from "next/server";

// 국토교통부 V-World 공간정보오픈플랫폼
// API 키 발급: https://www.vworld.kr/dev/v4dv_apifirst2_s001.do
// .env.local 에 VWORLD_API_KEY 추가 필요

const VWORLD = "https://api.vworld.kr/req/data";

// 비행금지구역 (P) — 빨강, 비행제한구역 (R) — 주황
const LAYERS = [
  { id: "LT_C_AISPRHC", type: "P", color: "#ff3b30" },
  { id: "LT_C_AISRESC", type: "R", color: "#ff9500" },
] as const;

type VWorldResponse = {
  response?: {
    status?: string;
    result?: {
      featureCollection?: GeoJSON.FeatureCollection;
    };
  };
};

async function fetchLayer(
  layerId: string,
  type: string,
  color: string,
  box: string,
  apiKey: string
): Promise<GeoJSON.Feature[]> {
  const url = new URL(VWORLD);
  url.searchParams.set("service", "data");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("data", layerId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("size", "1000");
  url.searchParams.set("page", "1");
  url.searchParams.set("geometry", "true");
  url.searchParams.set("attribute", "true");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("geomFilter", box);

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 }, // 5분 캐시
  });

  if (!res.ok) {
    console.error(`[airspace] ${layerId} error ${res.status}`);
    return [];
  }

  const json: VWorldResponse = await res.json();
  if (json?.response?.status !== "OK") return [];

  const features = json?.response?.result?.featureCollection?.features ?? [];

  // V-World GeoJSON 에 color/zoneType property 를 추가해 반환
  return features.map((f) => ({
    ...f,
    properties: { ...f.properties, zoneType: type, color },
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const swLat = searchParams.get("swLat");
  const swLon = searchParams.get("swLon");
  const neLat = searchParams.get("neLat");
  const neLon = searchParams.get("neLon");

  if (!swLat || !swLon || !neLat || !neLon) {
    return NextResponse.json({ error: "swLat, swLon, neLat, neLon required" }, { status: 400 });
  }

  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  // BOX(minX,minY,maxX,maxY) = BOX(minLon,minLat,maxLon,maxLat)
  const box = `BOX(${swLon},${swLat},${neLon},${neLat})`;

  try {
    const results = await Promise.all(
      LAYERS.map(({ id, type, color }) => fetchLayer(id, type, color, box, apiKey))
    );

    const features = results.flat();
    const geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
    return NextResponse.json(geojson);
  } catch (err) {
    console.error("[airspace] fetch error", err);
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
