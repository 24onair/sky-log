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

// XCTrack 유효 turnpoint type은 TAKEOFF / SSS / ESS 뿐. 일반 턴포인트와 골은
// type 필드를 생략해야 한다("" 반환 → 호출부에서 키 자체를 넣지 않음).
// "TURNPOINT"/"GOAL" 같은 값을 넣으면 XCTrack·Naviter 파서가 에러를 낸다.
function xctrackTurnpointType(index: number, total: number): string {
  if (index === 0) return "TAKEOFF";
  if (total > 2 && index === 1) return "SSS";
  if (total >= 4 && index === total - 2) return "ESS";
  return "";
}

// QR v2 turnpoint type 숫자: SSS=2, ESS=3, 나머지(TAKEOFF/일반/골)=0(생략)
function qrTurnpointType(index: number, total: number): number {
  if (total > 2 && index === 1) return 2;
  if (total >= 4 && index === total - 2) return 3;
  return 0;
}

// Google polyline EncodeInt (go-polyline과 동일 알고리즘). 값을 독립적으로 인코딩.
function polylineEncodeInt(value: number): string {
  let v = Math.round(value) * 2;
  if (v < 0) v = ~v;
  let s = "";
  while (v >= 0x20) {
    s += String.fromCharCode(((v & 0x1f) | 0x20) + 63);
    v = Math.floor(v / 32);
  }
  s += String.fromCharCode(v + 63);
  return s;
}

// QR "z" 필드: lon, lat, alt, radius 순서로 polyline 인코딩 (XCTrack MarshalJSON과 동일)
function encodeQRZ(lon: number, lat: number, alt: number, radius: number): string {
  return (
    polylineEncodeInt(Math.round(lon * 1e5)) +
    polylineEncodeInt(Math.round(lat * 1e5)) +
    polylineEncodeInt(Math.round(alt)) +
    polylineEncodeInt(Math.round(radius))
  );
}

// 한국시간(KST, UTC+9, DST 없음) "HH:MM" → XCTrack용 UTC "HH:MM:00Z"
function kstToUtcGate(hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const h = (parseInt(m[1], 10) - 9 + 24) % 24;
  return `${String(h).padStart(2, "0")}:${m[2]}:00Z`;
}

/**
 * XCTrack 태스크를 생성한다.
 *  - pretty=true : .xctsk 파일 다운로드용 → version 1 전체 JSON (들여쓰기)
 *  - pretty=false: QR 코드용 → version 2 compact JSON ("XCTSK:" 접두어)
 *
 * QR(v2)은 XCTrack이 "Share task → QR"로 실제 내보내는 형태와 **바이트 단위로
 * 동일**하게 맞춘다: 최상위 순서 version→taskType→t→s→g, earthModel(e) 필드
 * 생략, s는 {t,d,g} 순서에 방향 d=2(EXIT). 이렇게 해야 XCTrack뿐 아니라 엄격한
 * Naviter(SeeYou Navigator)도 인식한다. (과거 우리 v2는 e:0 추가 필드/방향이
 * 달라 Naviter가 거부, v1 전체 JSON은 Naviter가 "지난 포맷"으로 거부했음.)
 */
export function exportToXCTrack(task: Task | TaskInsert, pretty = true): string {
  const n = task.waypoints.length;
  const sssType = task.task_type === "CLASSIC" ? "ELAPSED-TIME" : "RACE";
  const startGate = kstToUtcGate(task.start_time) ?? "10:00:00Z";
  const deadlineGate = kstToUtcGate(task.deadline) ?? "20:00:00Z";

  if (!pretty) {
    // ── QR: XCTrack 네이티브 v2 포맷과 동일 ──
    const qr: Record<string, unknown> = {
      version: 2,
      taskType: "CLASSIC",
      t: task.waypoints.map((wp, i) => {
        const typeNum = qrTurnpointType(i, n);
        const tp: Record<string, unknown> = {
          z: encodeQRZ(wp.lon, wp.lat, wp.altitude ?? 0, wp.radius),
          n: wp.name,
        };
        if (typeNum) tp.t = typeNum; // SSS=2, ESS=3 일 때만
        return tp;
      }),
    };
    if (n >= 3) {
      qr.s = { t: sssType === "RACE" ? 1 : 2, d: 2, g: [startGate] }; // d=2 EXIT
      qr.g = { t: 2, d: deadlineGate }; // t=2 CYLINDER
    }
    return "XCTSK:" + JSON.stringify(qr);
  }

  // ── 파일 다운로드: version 1 전체 JSON ──
  const payload: Record<string, unknown> = {
    taskType: "CLASSIC",
    version: 1,
    earthModel: "WGS84",
    turnpoints: task.waypoints.map((wp, i) => {
      const t = xctrackTurnpointType(i, n);
      const tp: Record<string, unknown> = {
        radius: wp.radius,
        waypoint: {
          name: wp.name,
          description: "",
          lat: wp.lat,
          lon: wp.lon,
          altSmoothed: wp.altitude ?? 0,
        },
      };
      if (t) tp.type = t; // TAKEOFF/SSS/ESS 일 때만 포함
      return tp;
    }),
  };
  if (n >= 3) {
    payload.sss = { type: sssType, direction: "EXIT", timeGates: [startGate] };
    payload.goal = { type: "CYLINDER", deadline: deadlineGate };
  }
  return JSON.stringify(payload, null, 2);
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
