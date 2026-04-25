import { v4 as uuid } from "uuid";
import { Waypoint } from "@/lib/schemas/task";

// DDMM.MMMN → decimal degrees
function cupCoordToDecimal(s: string): number {
  const dir = s.slice(-1); // N/S/E/W
  const raw = s.slice(0, -1);
  const dotIdx = raw.indexOf(".");
  // minutes = last 2 digits before dot + fractional part
  const minStr = raw.slice(dotIdx - 2);
  const degStr = raw.slice(0, dotIdx - 2);
  const decimal = parseInt(degStr, 10) + parseFloat(minStr) / 60;
  return dir === "S" || dir === "W" ? -decimal : decimal;
}

// "500.0m" / "0m" / "1640ft" → meters
function cupElevToMeters(s: string): number {
  const m = s.match(/^([\d.]+)(m|ft)?$/i);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  return m[2]?.toLowerCase() === "ft" ? Math.round(val * 0.3048) : Math.round(val);
}

// Minimal CSV parser that handles quoted fields
function splitCUPLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; cur += ch; }
    else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function unquote(s: string): string {
  return s.replace(/^"|"$/g, "").trim();
}

export function parseCUP(text: string): Waypoint[] {
  const waypoints: Waypoint[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("name,") || line.startsWith("-----")) continue;
    const parts = splitCUPLine(line);
    if (parts.length < 6) continue;
    const name = unquote(parts[0]);
    const latStr = unquote(parts[3]);
    const lonStr = unquote(parts[4]);
    const elevStr = unquote(parts[5]);
    if (!latStr || !lonStr || !/[NS]$/i.test(latStr)) continue;
    try {
      waypoints.push({
        id: uuid(),
        name: name || `WP${waypoints.length + 1}`,
        lat: cupCoordToDecimal(latStr),
        lon: cupCoordToDecimal(lonStr),
        altitude: cupElevToMeters(elevStr),
        radius: 400,
        type: "T",
      });
    } catch { /* skip malformed line */ }
  }
  return waypoints;
}

// Decimal degrees → CUP lat string (DDMM.MMMN)
function toLatCUP(lat: number): string {
  const dir = lat >= 0 ? "N" : "S";
  const a = Math.abs(lat);
  const deg = Math.floor(a);
  const min = (a - deg) * 60;
  return `${String(deg).padStart(2, "0")}${min.toFixed(3)}${dir}`;
}

// Decimal degrees → CUP lon string (DDDMM.MMME)
function toLonCUP(lon: number): string {
  const dir = lon >= 0 ? "E" : "W";
  const a = Math.abs(lon);
  const deg = Math.floor(a);
  const min = (a - deg) * 60;
  return `${String(deg).padStart(3, "0")}${min.toFixed(3)}${dir}`;
}

export function waypointsToCUP(name: string, waypoints: Waypoint[]): string {
  const header = "name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc";
  const rows = waypoints.map((wp) =>
    `"${wp.name}","${wp.name}","KR",${toLatCUP(wp.lat)},${toLonCUP(wp.lon)},${wp.altitude}m,1,,,,""`
  );
  return [header, ...rows, `"${name}","${name}","KR",,,,,,,,`].join("\r\n");
}
