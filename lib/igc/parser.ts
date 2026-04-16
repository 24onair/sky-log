/**
 * IGC 파서 - 패러글라이딩 비행 데이터 추출
 */

export interface IGCParseResult {
  flightDate: Date;
  takeoffTime: string;
  landingTime: string;
  durationSec: number;
  maxAltitudeM: number;
  maxThermalMs: number;
  distanceStraightKm: number;
  distanceTrackKm: number;
  distanceXcontestKm: number;
  /** [lon, lat, alt] — sampled for map display (max 400 pts) */
  trackPoints: [number, number, number][];
  /** altitude values sampled for profile chart (max 200 pts) */
  altitudeProfile: number[];
}

interface Point {
  lat: number;
  lon: number;
  altitude: number;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function getDistance(p1: Point, p2: Point): number {
  const R = 6371;
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrackDistance(points: Point[]): number {
  // 샘플링: 최대 500포인트만 사용
  const step = Math.max(1, Math.floor(points.length / 500));
  let total = 0;
  for (let i = step; i < points.length; i += step) {
    total += getDistance(points[i - step], points[i]);
  }
  return total;
}

function getStraightDistance(points: Point[]): number {
  if (points.length < 2) return 0;
  return getDistance(points[0], points[points.length - 1]);
}

function parseHFDTE(line: string): Date | null {
  try {
    let dateStr = "";

    // 형식 1: HFDTE150821 또는 HFDTE 150821
    // 형식 2: HFDTEDATE:150821,01 또는 HFDTE DATE:150821
    const match = line.match(/HFDTE(?:DATE:)?[:\s]?(\d{6})/i);
    if (match) {
      dateStr = match[1];
    } else {
      return null;
    }

    const day = parseInt(dateStr.substring(0, 2), 10);
    const month = parseInt(dateStr.substring(2, 4), 10);
    const year = parseInt(dateStr.substring(4, 6), 10) + 2000;

    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
}

function parseTime(timeStr: string): number {
  if (!timeStr || timeStr.length < 6) return 0;
  const hh = parseInt(timeStr.substring(0, 2), 10) || 0;
  const mm = parseInt(timeStr.substring(2, 4), 10) || 0;
  const ss = parseInt(timeStr.substring(4, 6), 10) || 0;
  return hh * 3600 + mm * 60 + ss;
}

export function parseIGC(content: string): IGCParseResult {
  const lines = content.split(/\r?\n/);
  const points: Point[] = [];
  let flightDate: Date | null = null;
  let takeoffTime = "";
  let landingTime = "";
  let maxAltitude = 0;
  let maxThermal = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 날짜 파싱
    if (trimmed.startsWith("HFDTE") || trimmed.startsWith("HFDTE")) {
      if (!flightDate) {
        flightDate = parseHFDTE(trimmed);
      }
    }

    // B 레코드 (위치/고도)
    if (trimmed.charAt(0) === "B" && trimmed.length >= 35) {
      try {
        const time = trimmed.substring(1, 7);
        const latDeg = parseInt(trimmed.substring(7, 9), 10);
        const latMin = parseInt(trimmed.substring(9, 14), 10) / 1000;
        const latDir = trimmed.charAt(14);
        const lonDeg = parseInt(trimmed.substring(15, 18), 10);
        const lonMin = parseInt(trimmed.substring(18, 23), 10) / 1000;
        const lonDir = trimmed.charAt(23);
        const validity = trimmed.charAt(24);
        const pressureAlt = parseInt(trimmed.substring(25, 30), 10);
        const gnssAlt = parseInt(trimmed.substring(30, 35), 10);

        if (validity === "A" && !isNaN(latDeg) && !isNaN(lonDeg)) {
          const lat = (latDeg + latMin / 60) * (latDir === "S" ? -1 : 1);
          const lon = (lonDeg + lonMin / 60) * (lonDir === "W" ? -1 : 1);
          const altitude = gnssAlt > 0 ? gnssAlt : pressureAlt;

          points.push({ lat, lon, altitude });

          if (!takeoffTime) takeoffTime = time;
          landingTime = time;

          if (altitude > maxAltitude) maxAltitude = altitude;
        }
      } catch {
        // 잘못된 B 레코드 무시
      }
    }

    // K 레코드 (vario)
    if (trimmed.charAt(0) === "K" && trimmed.length >= 10) {
      try {
        const vario = parseInt(trimmed.substring(7, 10), 10) / 100;
        if (!isNaN(vario) && vario > maxThermal) maxThermal = vario;
      } catch {
        // 무시
      }
    }
  }

  if (!flightDate) {
    throw new Error("유효하지 않은 IGC 파일입니다 (날짜 정보 없음)");
  }

  if (points.length === 0) {
    throw new Error("유효하지 않은 IGC 파일입니다 (비행 데이터 없음)");
  }

  const takeoffSec = parseTime(takeoffTime);
  const landingSec = parseTime(landingTime);
  const durationSec =
    landingSec >= takeoffSec
      ? landingSec - takeoffSec
      : 86400 - takeoffSec + landingSec;

  const distanceStraight = getStraightDistance(points);
  const distanceTrack = getTrackDistance(points);

  // Track points for map (max 400 pts)
  const mapStep = Math.max(1, Math.floor(points.length / 400));
  const trackPoints: [number, number, number][] = [];
  for (let i = 0; i < points.length; i += mapStep) {
    trackPoints.push([points[i].lon, points[i].lat, points[i].altitude]);
  }
  // Always include last point
  const last = points[points.length - 1];
  if (trackPoints.length > 0) {
    const prev = trackPoints[trackPoints.length - 1];
    if (prev[0] !== last.lon || prev[1] !== last.lat) {
      trackPoints.push([last.lon, last.lat, last.altitude]);
    }
  }

  // Altitude profile for chart (max 200 pts)
  const altStep = Math.max(1, Math.floor(points.length / 200));
  const altitudeProfile: number[] = [];
  for (let i = 0; i < points.length; i += altStep) {
    altitudeProfile.push(points[i].altitude);
  }

  return {
    flightDate,
    takeoffTime,
    landingTime,
    durationSec: Math.max(0, durationSec),
    maxAltitudeM: maxAltitude,
    maxThermalMs: maxThermal,
    distanceStraightKm: Math.round(distanceStraight * 1000) / 1000,
    distanceTrackKm: Math.round(distanceTrack * 1000) / 1000,
    distanceXcontestKm: Math.round(distanceStraight * 1000) / 1000,
    trackPoints,
    altitudeProfile,
  };
}
