import { Waypoint, Task, TaskInsert, TaskType, WaypointType } from "@/lib/schemas/task";

// ── Geometry ─────────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute the single optimal touch point on each cylinder:
 * - Start (i=0): exit edge toward next wp
 * - End (i=n-1): entry edge from prev wp
 * - Middle: bisector of (toward-prev + toward-next) — the one point where
 *   the pilot touches the cylinder and immediately turns toward the next wp
 */
function computeTouchPoints(waypoints: Waypoint[]): [number, number][] {
  const n = waypoints.length;
  return waypoints.map((wp, i) => {
    const center: [number, number] = [wp.lon, wp.lat];

    if (i === 0) {
      const next = waypoints[1];
      const dm = haversine(wp.lat, wp.lon, next.lat, next.lon) * 1000;
      return dm > wp.radius
        ? destPoint(wp.lat, wp.lon, bearing(wp.lat, wp.lon, next.lat, next.lon), wp.radius)
        : center;
    }

    if (i === n - 1) {
      const prev = waypoints[n - 2];
      const dm = haversine(wp.lat, wp.lon, prev.lat, prev.lon) * 1000;
      return dm > wp.radius
        ? destPoint(wp.lat, wp.lon, bearing(wp.lat, wp.lon, prev.lat, prev.lon), wp.radius)
        : center;
    }

    // Middle: bisector direction between prev and next as seen from this wp
    const prev = waypoints[i - 1];
    const next = waypoints[i + 1];
    const bPrev = bearing(wp.lat, wp.lon, prev.lat, prev.lon);
    const bNext = bearing(wp.lat, wp.lon, next.lat, next.lon);
    const vx = Math.cos(bPrev) + Math.cos(bNext);
    const vy = Math.sin(bPrev) + Math.sin(bNext);
    const len = Math.sqrt(vx * vx + vy * vy);
    // degenerate (180° U-turn): touch the near side facing prev
    if (len < 1e-10) return destPoint(wp.lat, wp.lon, bPrev, wp.radius);
    return destPoint(wp.lat, wp.lon, Math.atan2(vy, vx), wp.radius);
  });
}

/** Optimum task distance (km): sum of distances between consecutive touch points */
export function calculateTaskDistance(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  const pts = computeTouchPoints(waypoints);
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += haversine(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]);
  }
  return Math.round(total * 10) / 10;
}

/** Center-to-center sum of all legs (km) — ignores cylinder sizes */
export function calculateCenterDistance(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversine(
      waypoints[i - 1].lat,
      waypoints[i - 1].lon,
      waypoints[i].lat,
      waypoints[i].lon
    );
  }
  return Math.round(total * 10) / 10;
}

/** Connected optimum path: one touch point per waypoint */
export function optimumLinePath(waypoints: Waypoint[]): [number, number][] {
  if (waypoints.length < 2) return [];
  return computeTouchPoints(waypoints);
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  return Math.atan2(
    Math.sin(Δλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  );
}

function destPoint(lat: number, lon: number, brng: number, distM: number): [number, number] {
  const R = 6371000;
  const d = distM / R;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(brng));
  const λ2 = λ1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
}

/** GeoJSON circle polygon (for Mapbox fill layer) */
export function circlePolygon(
  center: [number, number],
  radiusM: number,
  steps = 64
): [number, number][] {
  const pts: [number, number][] = [];
  const R = 6371000;
  const lat1 = (center[1] * Math.PI) / 180;
  const lon1 = (center[0] * Math.PI) / 180;
  const d = radiusM / R;

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
    pts.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return pts;
}

// ── Waypoint helpers ──────────────────────────────────────────────────────────

/** Position-aware name (stored + exported) */
export function waypointLabel(index: number, total: number): string {
  if (index === 0) return "Take Off";
  if (total > 2 && index === 1) return "SSS";
  if (total >= 4 && index === total - 2) return "ESS";
  if (index === total - 1) return "Landing";
  return `TurnPoint${String(index - 1).padStart(2, "0")}`;
}

/** Badge label shown in the UI (TPs all read "Turn Point") */
export function waypointRoleLabel(index: number, total: number): string {
  if (index === 0) return "Take Off";
  if (total > 2 && index === 1) return "SSS";
  if (total >= 4 && index === total - 2) return "ESS";
  if (index === total - 1) return "Landing";
  return "Turn Point";
}

/** Position-aware color */
export function waypointRoleColor(index: number, total: number): string {
  if (index === 0) return "#34c759";                       // Take Off: green
  if (total > 2 && index === 1) return "#ff9500";          // SSS: orange
  if (total >= 4 && index === total - 2) return "#bf5af2"; // ESS: purple
  if (index === total - 1) return "#ff3b30";               // Landing: red
  return "#0071e3";                                         // TP: blue
}

/** Short text shown inside map marker */
export function waypointMarkerText(index: number, total: number): string {
  if (index === 0) return "TO";
  if (total > 2 && index === 1) return "S";
  if (total >= 4 && index === total - 2) return "E";
  if (index === total - 1) return "LZ";
  return String(index - 1);
}

/** Legacy color by type — kept for any existing callers */
export function waypointColor(type: WaypointType): string {
  if (type === "D") return "#34c759";
  if (type === "G") return "#ff3b30";
  return "#0071e3";
}

/** Assign D/T/G types to waypoints based on their position */
export function assignWaypointTypes(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.map((wp, i) => ({
    ...wp,
    type: i === 0 ? "D" : i === waypoints.length - 1 ? "G" : "T",
  }));
}

/** Default radius — 400 m for all types */
export function defaultRadius(_type: WaypointType): number {
  return 400;
}

/** Auto-generate waypoint name by position */
export function autoName(type: WaypointType, index: number): string {
  if (type === "D") return "D01";
  if (type === "G") return "G01";
  return `T${String(index).padStart(2, "0")}`;
}

// ── Export: CUP ───────────────────────────────────────────────────────────────

function toCupLat(lat: number): string {
  const NS = lat >= 0 ? "N" : "S";
  const abs = Math.abs(lat);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return `${String(deg).padStart(2, "0")}${min.toFixed(3).padStart(6, "0")}${NS}`;
}

function toCupLon(lon: number): string {
  const EW = lon >= 0 ? "E" : "W";
  const abs = Math.abs(lon);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return `${String(deg).padStart(3, "0")}${min.toFixed(3).padStart(6, "0")}${EW}`;
}

export function exportToCUP(task: Task | TaskInsert): string {
  const rows = task.waypoints
    .map((wp) => {
      const style = wp.type === "D" ? 2 : wp.type === "G" ? 3 : 1;
      return `"${wp.name}","${wp.name}","KR",${toCupLat(wp.lat)},${toCupLon(wp.lon)},${wp.altitude || 0}m,${style},,,,""`;
    })
    .join("\n");
  return `name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc\n${rows}`;
}

// ── Export: XCTrack (.xctsk) ──────────────────────────────────────────────────

const xctrackType = (wp: Waypoint): string => {
  if (wp.type === "D") return "TAKEOFF";
  if (wp.type === "G") return "GOAL";
  return "TURNPOINT";
};

/** pretty=true for file download, false for QR (minimises data size) */
export function exportToXCTrack(task: Task | TaskInsert, pretty = true): string {
  const typeMap: Record<TaskType, string> = {
    RACE: "RACE_TO_GOAL",
    CLASSIC: "OPEN_DISTANCE",
    FAI: "FAI_TRIANGLE",
  };

  const payload = {
    taskType: typeMap[task.task_type],
    version: 1,
    turnpoints: task.waypoints.map((wp) => ({
      radius: wp.radius,
      type: xctrackType(wp),
      waypoint: {
        name: wp.name,
        description: "",
        lat: wp.lat,
        lon: wp.lon,
        altSmoothing: 0,
      },
    })),
  };

  return JSON.stringify(payload, null, pretty ? 2 : undefined);
}

// ── Download helpers ──────────────────────────────────────────────────────────

export function downloadBlob(content: string, filename: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
