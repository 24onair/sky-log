import { NextRequest, NextResponse } from "next/server";

// 드론원스톱 Open API — https://drone.onestop.go.kr
// API 키 발급: 드론원스톱 → 마이페이지 → Open API 신청
// .env.local 에 DRONE_ONESTOP_API_KEY 추가 필요

const BASE = "https://drone.onestop.go.kr/api/v1";

type ZoneType = "P" | "R" | "D" | "CTR" | string;

interface RawZone {
  zoneId?: string;
  zoneName?: string;
  zoneType?: ZoneType;
  centerLat?: number;
  centerLon?: number;
  radius?: number;       // meters
  minAlt?: number;
  maxAlt?: number;
  geometry?: GeoJSON.Geometry;
}

function zoneColor(type: ZoneType): string {
  if (type === "P") return "#ff3b30";   // 비행금지구역
  if (type === "R") return "#ff9500";   // 비행제한구역
  if (type === "D") return "#ffcc00";   // 위험구역
  return "#0071e3";                      // 관제권/기타
}

function circleToPolygon(lon: number, lat: number, radiusM: number): number[][] {
  const steps = 64;
  const R = 6371000;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const d = radiusM / R;
  const coords: number[][] = [];

  for (let i = 0; i <= steps; i++) {
    const θ = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(θ)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );
    coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return coords;
}

function toFeature(zone: RawZone): GeoJSON.Feature | null {
  let geometry: GeoJSON.Geometry | null = null;

  if (zone.geometry) {
    geometry = zone.geometry;
  } else if (
    zone.centerLat != null && zone.centerLon != null && zone.radius != null
  ) {
    geometry = {
      type: "Polygon",
      coordinates: [circleToPolygon(zone.centerLon, zone.centerLat, zone.radius)],
    };
  }

  if (!geometry) return null;

  return {
    type: "Feature",
    properties: {
      id: zone.zoneId ?? "",
      name: zone.zoneName ?? "",
      type: zone.zoneType ?? "",
      color: zoneColor(zone.zoneType ?? ""),
      minAlt: zone.minAlt ?? 0,
      maxAlt: zone.maxAlt ?? 0,
    },
    geometry,
  };
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

  const apiKey = process.env.DRONE_ONESTOP_API_KEY;
  if (!apiKey) {
    // API 키 미설정 시 빈 컬렉션 반환 (지도는 정상 작동)
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  try {
    const url = new URL(`${BASE}/restriction/zone/list`);
    url.searchParams.set("minLat", swLat);
    url.searchParams.set("minLon", swLon);
    url.searchParams.set("maxLat", neLat);
    url.searchParams.set("maxLon", neLon);
    url.searchParams.set("serviceKey", apiKey);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // 5분 캐시
    });

    if (!res.ok) {
      console.error("[airspace] API error", res.status, await res.text());
      return NextResponse.json({ type: "FeatureCollection", features: [] });
    }

    const json = await res.json();

    // 드론원스톱 API 응답 구조: { code, data: [...] }
    const raw: RawZone[] = Array.isArray(json?.data) ? json.data : [];
    const features = raw.map(toFeature).filter(Boolean) as GeoJSON.Feature[];

    const geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
    return NextResponse.json(geojson);
  } catch (err) {
    console.error("[airspace] fetch error", err);
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
