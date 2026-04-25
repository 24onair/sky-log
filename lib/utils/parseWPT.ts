import { v4 as uuid } from "uuid";
import { Waypoint } from "@/lib/schemas/task";

type WPTFormat = "geo" | "ozi" | "unknown";

function detectFormat(text: string): WPTFormat {
  const first = text.split("\n")[0].trim();
  if (first.startsWith("$FormatGEO")) return "geo";
  if (first.startsWith("OziExplorer")) return "ozi";
  return "unknown";
}

// Strip type prefix like "-L-", "-T-", "-G-" from OziExplorer descriptions
function cleanOziName(s: string): string {
  return s.trim().replace(/^-[A-Z]+-\s*/, "").trim();
}

// $FormatGEO format:
// CODE  N DD MM SS.SS  E DDD MM SS.SS  ALT  Name with spaces
function parseGEO(text: string): Waypoint[] {
  const waypoints: Waypoint[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("$") || line.startsWith("//")) continue;
    const parts = line.split(/\s+/);
    // Minimum: code, N/S, deg, min, sec, E/W, deg, min, sec, alt, name
    if (parts.length < 11) continue;
    if (parts[1] !== "N" && parts[1] !== "S") continue;
    if (parts[5] !== "E" && parts[5] !== "W") continue;
    try {
      const latDeg = parseInt(parts[2]);
      const latMin = parseInt(parts[3]);
      const latSec = parseFloat(parts[4]);
      let lat = latDeg + latMin / 60 + latSec / 3600;
      if (parts[1] === "S") lat = -lat;

      const lonDeg = parseInt(parts[6]);
      const lonMin = parseInt(parts[7]);
      const lonSec = parseFloat(parts[8]);
      let lon = lonDeg + lonMin / 60 + lonSec / 3600;
      if (parts[5] === "W") lon = -lon;

      const altitude = parseInt(parts[9]) || 0;
      const name = parts.slice(10).join(" ").trim() || parts[0];

      waypoints.push({ id: uuid(), name, lat, lon, altitude, radius: 400, type: "T" });
    } catch { /* skip malformed line */ }
  }
  return waypoints;
}

// OziExplorer Waypoint File Version 1.x
// Fields (0-indexed): 0=num, 1=code, 2=lat, 3=lon, 4=date, 5=sym, 6=status,
//   7=map_fmt, 8=fg_color, 9=bg_color, 10=desc, 11=ptr, 12=?, 13=?, 14=alt_m
function parseOzi(text: string): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const lines = text.split("\n");
  // Skip 4 header lines
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    if (parts.length < 15) continue;
    const lat = parseFloat(parts[2]);
    const lon = parseFloat(parts[3]);
    if (isNaN(lat) || isNaN(lon)) continue;
    const rawAlt = parseInt(parts[14] ?? "0");
    const altitude = rawAlt === -777 ? 0 : Math.max(0, rawAlt);
    const desc = cleanOziName(parts[10] ?? "");
    const code = parts[1].trim();
    const name = desc || code || `WP${waypoints.length + 1}`;
    waypoints.push({ id: uuid(), name, lat, lon, altitude, radius: 400, type: "T" });
  }
  return waypoints;
}

export function parseWPT(text: string): Waypoint[] {
  const fmt = detectFormat(text);
  if (fmt === "geo") return parseGEO(text);
  if (fmt === "ozi") return parseOzi(text);
  // Fallback: try GEO
  const geo = parseGEO(text);
  return geo.length > 0 ? geo : [];
}
