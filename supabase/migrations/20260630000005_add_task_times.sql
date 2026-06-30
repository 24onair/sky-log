-- tasks 에 스타트/종료 시간 추가 (XCTrack timeGates / goal deadline)
--
-- 한국시간(KST) "HH:MM" 문자열로 저장한다. XCTrack(.xctsk) 익스포트 시
-- UTC(−9h)로 변환해 sss.timeGates[0] / goal.deadline 에 넣는다.
-- nullable — 미입력 시 익스포트는 기존 기본값을 사용. 멱등 작성.

alter table tasks
  add column if not exists start_time text;

alter table tasks
  add column if not exists deadline text;
