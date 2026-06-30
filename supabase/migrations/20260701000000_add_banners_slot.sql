-- banners.slot — 배너를 노출할 위치(슬롯) 타겟팅
--
-- 'all'  = 모든 슬롯에 노출 (기존 배너 호환: 기본값)
-- 그 외  = logbook | tasks | waypoints | flight_detail | task_new
-- getActiveBanners(slot)이 slot in (요청슬롯, 'all') 인 활성 배너를 sort_order 순으로 조회.
-- 재실행해도 안전(if not exists).

alter table public.banners
  add column if not exists slot text not null default 'all';
