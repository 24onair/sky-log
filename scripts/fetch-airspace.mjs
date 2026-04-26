/**
 * V-World 비행금지/제한구역 데이터 다운로드 스크립트
 * 로컬(한국 IP)에서 실행: node scripts/fetch-airspace.mjs
 * 결과: public/airspace-korea.geojson
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const API_KEY = process.env.NEXT_PUBLIC_VWORLD_API_KEY || "DF88154B-38EE-3CE1-B62F-755933D43309";
const BASE_URL = "https://api.vworld.kr/req/data";
const PAGE_SIZE = 1000;

const LAYERS = [
  { id: "LT_C_AISPRHC", zoneType: "P" }, // 비행금지
  { id: "LT_C_AISRESC", zoneType: "R" }, // 비행제한
];

async function fetchPage(layerId, page) {
  const url = new URL(BASE_URL);
  url.searchParams.set("service", "data");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("data", layerId);
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("size", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("geometry", "true");
  url.searchParams.set("attribute", "true");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("geomFilter", "BOX(124.0,33.0,132.0,39.0)"); // 한국 전체

  const res = await fetch(url.toString(), {
    headers: { Referer: "https://sky-log-brown.vercel.app/" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  const json = await res.json();
  if (json?.response?.status !== "OK") {
    throw new Error(`V-World error: ${json?.response?.status} — ${JSON.stringify(json?.response?.error ?? "")}`);
  }
  return json.response.result;
}

async function fetchAllFeatures(layer) {
  console.log(`\n[${layer.id}] 다운로드 시작...`);
  const firstResult = await fetchPage(layer.id, 1);
  const total = Number(firstResult.totalCount ?? 0);
  const features = firstResult.featureCollection?.features ?? [];
  console.log(`  총 ${total}개 (1페이지: ${features.length}개)`);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  for (let p = 2; p <= totalPages; p++) {
    const result = await fetchPage(layer.id, p);
    const batch = result.featureCollection?.features ?? [];
    features.push(...batch);
    console.log(`  ${p}/${totalPages} 페이지 — 누계 ${features.length}개`);
  }

  return features.map((f) => ({
    ...f,
    properties: { ...f.properties, zoneType: layer.zoneType },
  }));
}

async function main() {
  console.log("V-World 비행구역 데이터 다운로드");
  console.log("=================================");

  const allFeatures = [];
  for (const layer of LAYERS) {
    const features = await fetchAllFeatures(layer);
    allFeatures.push(...features);
  }

  const geojson = {
    type: "FeatureCollection",
    features: allFeatures,
  };

  const __dir = dirname(fileURLToPath(import.meta.url));
  const outPath = join(__dir, "../public/airspace-korea.geojson");
  writeFileSync(outPath, JSON.stringify(geojson));

  const byType = {};
  allFeatures.forEach((f) => {
    const t = f.properties?.zoneType ?? "?";
    byType[t] = (byType[t] ?? 0) + 1;
  });

  console.log("\n완료!");
  console.log(`  총 피처: ${allFeatures.length}개`);
  console.log(`  비행금지(P): ${byType.P ?? 0}개`);
  console.log(`  비행제한(R): ${byType.R ?? 0}개`);
  console.log(`  저장 위치: public/airspace-korea.geojson`);
}

main().catch((e) => { console.error("오류:", e.message); process.exit(1); });
