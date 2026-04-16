/**
 * IGC 파서 - 패러글라이딩 비행 데이터 추출
 * IGC는 FAI(Fédération Aéronautique Internationale)에서 정의한 표준 파일 형식
 */

interface IGCParseResult {
  flightDate: Date;
  takeoffTime: string; // HH:MM:SS
  landingTime: string; // HH:MM:SS
  durationSec: number;
  maxAltitudeM: number;
  maxThermalMs: number;
  distanceStraightKm: number;
  distanceTrackKm: number;
  distanceXcontestKm: number;
  coordinates: Array<{
    lat: number;
    lon: number;
    altitude: number;
    time: string;
  }>;
}

interface Point {
  lat: number;
  lon: number;
  altitude: number;
}

/**
 * Haversine 공식을 이용해 두 좌표 간 거리 계산 (km)
 */
function getDistance(p1: Point, p2: Point): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 경로의 누적 거리 계산
 */
function getTrackDistance(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += getDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * 직선 거리 (이륙지점과 착륙지점 사이)
 */
function getStraightDistance(points: Point[]): number {
  if (points.length < 2) return 0;
  return getDistance(points[0], points[points.length - 1]);
}

/**
 * FAI 삼각형 최적 포인트 3개 찾기 (XContest 방식)
 * 가장 큰 삼각형 형태의 3개 지점을 찾아서 거리 계산
 */
function getFAITriangleDistance(points: Point[]): number {
  if (points.length < 3) return getStraightDistance(points);

  let maxDistance = 0;

  // 샘플링으로 성능 최적화 (모든 조합을 검사하지 않음)
  const step = Math.max(1, Math.floor(points.length / 100));

  for (let i = 0; i < points.length; i += step) {
    for (let j = i + 1; j < points.length; j += step) {
      for (let k = j + 1; k < points.length; k += step) {
        const p1 = points[i];
        const p2 = points[j];
        const p3 = points[k];

        const d1 = getDistance(p1, p2);
        const d2 = getDistance(p2, p3);
        const d3 = getDistance(p3, p1);
        const totalDist = d1 + d2 + d3;

        if (totalDist > maxDistance) {
          maxDistance = totalDist;
        }
      }
    }
  }

  return maxDistance > 0 ? maxDistance / 3 : getStraightDistance(points);
}

/**
 * IGC 파일 파싱
 */
export function parseIGC(content: string): IGCParseResult {
  const lines = content.split("\n");
  const points: Point[] = [];
  let flightDate: Date | null = null;
  let takeoffTime = "";
  let landingTime = "";
  let maxAltitude = 0;
  let maxThermal = 0;

  for (const line of lines) {
    // 비행 날짜 (HFDTE)
    if (line.startsWith("HFDTE")) {
      const dateStr = line.substring(5, 11); // DDMMYY
      const day = parseInt(dateStr.substring(0, 2), 10);
      const month = parseInt(dateStr.substring(2, 4), 10);
      const year = parseInt(dateStr.substring(4, 6), 10) + 2000;
      flightDate = new Date(year, month - 1, day);
    }

    // B 레코드 (위치, 고도, 시간)
    if (line.startsWith("B")) {
      const time = line.substring(1, 7); // HHMMSS
      const lat = parseInt(line.substring(7, 9), 10) + parseInt(line.substring(9, 11), 10) / 60;
      const latDir = line.charAt(11); // N/S
      const lon = parseInt(line.substring(12, 15), 10) + parseInt(line.substring(15, 17), 10) / 60;
      const lonDir = line.charAt(17); // E/W
      const validityChar = line.charAt(18); // A/V
      const pressureAlt = parseInt(line.substring(19, 24), 10);
      const gnssAlt = line.length > 24 ? parseInt(line.substring(24, 29), 10) : pressureAlt;

      if (validityChar === "A") {
        const latitude = latDir === "S" ? -lat : lat;
        const longitude = lonDir === "W" ? -lon : lon;

        points.push({
          lat: latitude,
          lon: longitude,
          altitude: gnssAlt || pressureAlt,
        });

        if (!takeoffTime) {
          takeoffTime = time;
        }
        landingTime = time;

        const altitude = gnssAlt || pressureAlt;
        if (altitude > maxAltitude) {
          maxAltitude = altitude;
        }
      }
    }

    // K 레코드 또는 B 레코드의 vario (최고 써멀)
    if (line.startsWith("K")) {
      const vario = parseInt(line.substring(7, 10), 10) / 100;
      if (vario > maxThermal) {
        maxThermal = vario;
      }
    }
  }

  // 비행시간 계산
  const [takeoffHH, takeoffMM, takeoffSS] = [
    parseInt(takeoffTime.substring(0, 2), 10),
    parseInt(takeoffTime.substring(2, 4), 10),
    parseInt(takeoffTime.substring(4, 6), 10),
  ];
  const [landingHH, landingMM, landingSS] = [
    parseInt(landingTime.substring(0, 2), 10),
    parseInt(landingTime.substring(2, 4), 10),
    parseInt(landingTime.substring(4, 6), 10),
  ];

  const takeoffTotalSec = takeoffHH * 3600 + takeoffMM * 60 + takeoffSS;
  const landingTotalSec = landingHH * 3600 + landingMM * 60 + landingSS;
  const durationSec =
    landingTotalSec >= takeoffTotalSec
      ? landingTotalSec - takeoffTotalSec
      : 86400 - takeoffTotalSec + landingTotalSec; // 자정 지나간 경우

  const distanceTrack = getTrackDistance(points);
  const distanceStraight = getStraightDistance(points);
  const distanceXcontest = Math.max(
    distanceStraight,
    getFAITriangleDistance(points)
  );

  if (!flightDate) {
    throw new Error("Invalid IGC file: No HFDTE record found");
  }

  return {
    flightDate,
    takeoffTime,
    landingTime,
    durationSec,
    maxAltitudeM: maxAltitude,
    maxThermalMs: maxThermal,
    distanceStraightKm: Math.round(distanceStraight * 1000) / 1000,
    distanceTrackKm: Math.round(distanceTrack * 1000) / 1000,
    distanceXcontestKm: Math.round(distanceXcontest * 1000) / 1000,
    coordinates: points.map((p, i) => ({
      ...p,
      time: `${String(Math.floor((takeoffTotalSec + (i * durationSec) / points.length) / 3600)).padStart(2, "0")}:${String(Math.floor(((takeoffTotalSec + (i * durationSec) / points.length) % 3600) / 60)).padStart(2, "0")}:${String((takeoffTotalSec + (i * durationSec) / points.length) % 60).padStart(2, "0")}`,
    })),
  };
}
