/**
 * AC CTR (OpenAir 형식) → GeoJSON 변환 스크립트
 * node scripts/parse-ctr.mjs
 * 결과: public/airspace-ctr.geojson
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

function parseDMS(str) {
  // "37:33:23 N", "126:47:40 E", "37:26:43.97 N", "129:2:8 E"
  const m = str.trim().match(/^(\d+):(\d+):(\d+(?:\.\d+)?)\s*([NSEW])/);
  if (!m) return null;
  let v = +m[1] + +m[2] / 60 + +m[3] / 3600;
  if (m[4] === "S" || m[4] === "W") v = -v;
  return v;
}

function parseVX(line) {
  // "V X=37:33:23 N  126:47:40 E"
  const m = line.match(/V\s+X=(\d+:\d+:\d+(?:\.\d+)?\s*N)\s+(\d+:\d+:\d+(?:\.\d+)?\s*E)/);
  if (!m) return null;
  return { lat: parseDMS(m[1]), lon: parseDMS(m[2]) };
}

// Generate circle polygon (nautical miles radius)
function circlePolygon(centerLon, centerLat, radiusNm, steps = 64) {
  const R_EARTH_NM = 3440.065; // Earth radius in nautical miles
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusNm / R_EARTH_NM) * (180 / Math.PI) * Math.cos(angle);
    const dLon = (radiusNm / R_EARTH_NM) * (180 / Math.PI) * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
    coords.push([centerLon + dLon, centerLat + dLat]);
  }
  return coords;
}

const src = readFileSync(join(__dir, "ac-ctr-source.txt"), "utf8");

// Split into blocks by "AC CTR"
const rawBlocks = src.split(/\r?\n(?=AC CTR)/).map(b => b.trim()).filter(Boolean);

const features = [];
const seen = new Set(); // deduplicate by name+center

for (const block of rawBlocks) {
  const lines = block.split(/\r?\n/).map(l => l.trim());
  const name = (lines.find(l => l.startsWith("AN "))?.replace("AN ", "") ?? "").trim();
  const dc = parseFloat(lines.find(l => l.startsWith("DC "))?.replace("DC ", "") ?? "NaN");
  const vLine = lines.find(l => l.startsWith("V X="));
  const center = vLine ? parseVX(vLine) : null;
  const ahLine = lines.find(l => l.startsWith("AH "));
  const alLine = lines.find(l => l.startsWith("AL "));

  if (!name || isNaN(dc) || !center) {
    console.warn("  SKIP (parse fail):", name || "unnamed");
    continue;
  }

  const key = `${name}|${center.lat.toFixed(4)}|${center.lon.toFixed(4)}`;
  if (seen.has(key)) {
    console.log(`  DUP skip: ${name}`);
    continue;
  }
  seen.add(key);

  const coords = circlePolygon(center.lon, center.lat, dc);
  features.push({
    type: "Feature",
    properties: {
      name: name.replace(/_/g, " "),
      zoneType: "CTR",
      radiusNm: dc,
      altLow: alLine?.replace("AL ", "") ?? "0 MSL",
      altHigh: ahLine?.replace("AH ", "") ?? "",
      lat: center.lat,
      lon: center.lon,
    },
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  });
}

const geojson = { type: "FeatureCollection", features };
const outPath = join(__dir, "../public/airspace-ctr.geojson");
writeFileSync(outPath, JSON.stringify(geojson));

console.log(`\n완료: ${features.length}개 CTR 구역`);
features.forEach(f => {
  const p = f.properties;
  console.log(`  ${p.name.padEnd(20)} lat=${p.lat.toFixed(4)} lon=${p.lon.toFixed(4)} r=${p.radiusNm}nm`);
});
console.log(`\n저장: public/airspace-ctr.geojson`);
