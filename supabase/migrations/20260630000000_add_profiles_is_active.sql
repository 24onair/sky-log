-- profiles.is_active 컬럼 추가 (회원 승인 게이트)
--
-- 운영 DB에는 이미 수동으로 추가돼 있던 컬럼을 마이그레이션으로 역기록한다.
-- 가입 시 false(승인 대기) → 어드민이 /admin/members 에서 true(활성)로 전환.
-- auth/login 이 이 값을 검사해 미승인 회원의 로그인을 차단한다.
-- 이미 존재하는 운영 DB에 적용해도 안전하도록 IF NOT EXISTS 사용.

alter table profiles
  add column if not exists is_active boolean not null default false;
