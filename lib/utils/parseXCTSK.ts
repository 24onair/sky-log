import { Waypoint, TaskType } from "@/lib/schemas/task";

export interface ParsedXcTask {
  waypoints: Waypoint[]; // type "T" — 호출부에서 assignWaypointTypes로 위치별 재지정
  task_type: TaskType;
  start_time: string | null; // KST "HH:MM"
  deadline: string | null; // KST "HH:MM"
}

interface XcTurnpoint {
  radius?: number;
  type?: string;
  waypoint?: { lon?: number; lat?: number; altSmoothed?: number; name?: string };
}

// XCTrack UTC "HH:MM:SSZ" → 한국시간(KST, UTC+9) "HH:MM"
function utcGateToKst(g?: string | null): string | null {
  if (!g) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(g).trim());
  if (!m) return null;
  const h = (parseInt(m[1], 10) + 9) % 24;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * XCTrack 타스크 파일(.xctsk, version 1 full format)을 파싱해 앱 타스크로 변환한다.
 * turnpoints[].waypoint(lat/lon/altSmoothed/name) + radius 를 Waypoint로,
 * sss.timeGates[0]/goal.deadline 을 KST 시간으로 가져온다.
 */
export function parseXCTSK(text: string): ParsedXcTask {
  let data: {
    turnpoints?: XcTurnpoint[];
    sss?: { type?: string; timeGates?: string[] };
    goal?: { deadline?: string };
  };
  try {
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    throw new Error("타스크 파일을 읽을 수 없습니다 (JSON 형식이 아닙니다).");
  }

  const tps = data.turnpoints;
  if (!Array.isArray(tps) || tps.length === 0) {
    throw new Error("유효한 XCTrack 타스크 파일이 아닙니다 (turnpoints 없음).");
  }

  const waypoints: Waypoint[] = tps
    .map((tp) => {
      const wp = tp.waypoint ?? {};
      return {
        id: crypto.randomUUID(),
        name: String(wp.name ?? "").trim(),
        lat: Number(wp.lat),
        lon: Number(wp.lon),
        altitude: Number(wp.altSmoothed ?? 0) || 0,
        radius: Number(tp.radius ?? 400) || 0,
        type: "T" as const,
      };
    })
    .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lon));

  if (waypoints.length < 2) {
    throw new Error("좌표가 있는 턴포인트가 2개 이상 필요합니다.");
  }

  const sssType = data.sss?.type;
  const task_type: TaskType = sssType === "RACE" ? "RACE" : sssType ? "CLASSIC" : "RACE";

  return {
    waypoints,
    task_type,
    start_time: utcGateToKst(data.sss?.timeGates?.[0]),
    deadline: utcGateToKst(data.goal?.deadline),
  };
}
