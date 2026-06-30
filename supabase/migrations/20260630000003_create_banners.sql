-- banners 테이블 (배너 광고) + admin_insert_banner 함수
--
-- 테이블/함수 모두 운영 DB에 수동 생성돼 있던 것을 마이그레이션으로 역기록한다.
-- 공개 읽기: 누구나 활성 배너 조회(getActiveBanners). 쓰기: service role 전용
-- (/api/admin/banners, requireAdmin 가드 경유). 재실행해도 안전하게 작성.

create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  link_url    text not null,
  is_active   boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz default now()
);

alter table public.banners enable row level security;

drop policy if exists "public_read" on public.banners;
create policy "public_read" on public.banners
  for select using (true);

drop policy if exists "service_all" on public.banners;
create policy "service_all" on public.banners
  for all using (auth.role() = 'service_role');

-- 배너 이미지용 공개 Storage 버킷 (수동 생성분 역기록)
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

-- 배너 삽입 RPC: /api/admin/banners(POST)에서 rpc/admin_insert_banner 로 호출.
-- 삽입한 행을 그대로 반환한다(라우트가 응답 JSON을 Banner로 사용).
create or replace function public.admin_insert_banner(
  p_image_url text,
  p_link_url  text,
  p_is_active boolean,
  p_sort_order integer
)
returns public.banners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.banners;
begin
  insert into public.banners (image_url, link_url, is_active, sort_order)
  values (p_image_url, p_link_url, coalesce(p_is_active, true), coalesce(p_sort_order, 0)::smallint)
  returning * into v_row;
  return v_row;
end;
$$;
