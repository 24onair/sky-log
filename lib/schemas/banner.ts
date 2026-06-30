export interface Banner {
  id: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
  slot: string;
  created_at: string;
}

export type BannerInsert = Omit<Banner, "id" | "created_at">;
export type BannerUpdate = Partial<BannerInsert>;

/** 배너를 노출할 수 있는 슬롯(위치) 목록. 'all'은 모든 슬롯에 노출. */
export const BANNER_SLOTS = [
  { key: "all", label: "모든 슬롯" },
  { key: "logbook", label: "로그북 목록" },
  { key: "tasks", label: "타스크 목록" },
  { key: "waypoints", label: "웨이포인트 목록" },
  { key: "flight_detail", label: "비행 상세" },
  { key: "task_new", label: "타스크 제작" },
] as const;

export type BannerSlot = (typeof BANNER_SLOTS)[number]["key"];

export function bannerSlotLabel(slot: string): string {
  return BANNER_SLOTS.find((s) => s.key === slot)?.label ?? slot;
}
