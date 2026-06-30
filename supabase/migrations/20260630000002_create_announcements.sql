-- announcements 테이블 (공지 팝업)
--
-- 그동안 테이블 생성 SQL이 마이그레이션이 아니라 관리자 페이지 안내문
-- (app/admin/announcements/page.tsx)에 주석으로만 존재했다. 운영 DB의 실제
-- 스키마/RLS를 마이그레이션으로 정식 이관한다. 재실행해도 안전하게 작성.
--
-- 공개 읽기: 비로그인 포함 누구나 활성 공지를 조회(getActiveAnnouncement).
-- 쓰기: service role 전용 (/api/admin/announcements, requireAdmin 가드 경유).

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

alter table public.announcements enable row level security;

drop policy if exists "public_read" on public.announcements;
create policy "public_read" on public.announcements
  for select using (true);

drop policy if exists "service_all" on public.announcements;
create policy "service_all" on public.announcements
  for all using (auth.role() = 'service_role');

-- 공지 이미지용 공개 Storage 버킷 (수동 생성분 역기록)
insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do nothing;
