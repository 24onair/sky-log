-- profiles.role 컬럼 추가 (role 기반 권한 모델)
--
-- 그동안 어드민 판정을 코드에 박힌 이메일 문자열(24onair@gmail.com) 비교로 했다.
-- 권한을 데이터로 옮겨, 코드 수정/재배포 없이 DB에서 운영자를 추가/해제할 수 있게 한다.
-- 'user'(기본) / 'admin' 2단계. 멱등하게 작성 — 재실행해도 안전.

alter table profiles
  add column if not exists role text not null default 'user';

-- 허용값 제약 (ADD CONSTRAINT는 IF NOT EXISTS 미지원 → DO 블록으로 멱등 처리)
do $$
begin
  alter table profiles
    add constraint profiles_role_check check (role in ('user', 'admin'));
exception
  when duplicate_object then null;
end $$;

-- 기존 소유자를 어드민으로 승격 (최초 1회)
update profiles
  set role = 'admin'
  where email = '24onair@gmail.com' and role <> 'admin';
