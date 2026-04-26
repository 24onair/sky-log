import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "VWORLD_API_KEY not set" });

  const url = new URL("https://api.vworld.kr/req/data");
  url.searchParams.set("service", "data");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("data", "LT_C_AISPRHC");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("size", "10");
  url.searchParams.set("page", "1");
  url.searchParams.set("geometry", "true");
  url.searchParams.set("attribute", "true");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("geomFilter", "BOX(126.8,37.4,127.2,37.7)");

  const reqUrl = url.toString().replace(apiKey, "***");

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }
    return NextResponse.json({ httpStatus: res.status, requestUrl: reqUrl, body: json });
  } catch (e) {
    return NextResponse.json({ error: String(e), requestUrl: reqUrl });
  }
}
