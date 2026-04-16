-- Create flight_logs table
create table flight_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,

  -- 필수 필드
  flight_date   timestamptz not null,        -- 이륙 날짜/시간
  duration_sec  integer not null,            -- 비행시간 (초)
  site_id       uuid references sites(id) not null,  -- 이륙장

  -- 비행 거리 (nullable, IGC 또는 수동)
  distance_straight_km  numeric(7,3),        -- 직선 거리
  distance_track_km     numeric(7,3),        -- 경로 누적 거리
  distance_xcontest_km  numeric(7,3),        -- XContest 방식

  -- 고도/써멀 (nullable)
  max_altitude_m        integer,             -- 최고 고도 (MSL)
  max_thermal_ms        numeric(4,1),        -- 최고 써멀 (m/s)

  -- 날씨 (구조화, nullable)
  wind_direction        smallint,            -- 풍향 (0~360도)
  wind_speed_kmh        numeric(5,1),        -- 풍속 (km/h)
  weather_condition     text,                -- 맑음/흐림/구름많음 등

  -- 기타
  memo                  text,
  igc_parsed            boolean default false,  -- IGC 파싱 여부

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 인덱스 생성
create index on flight_logs(user_id, flight_date desc);
create index on flight_logs(site_id);

-- RLS 활성화
alter table flight_logs enable row level security;

-- RLS 정책: 사용자는 자신의 로그만 볼 수 있음
create policy "Users can view their own flight logs"
  on flight_logs for select
  using (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 로그를 생성할 수 있음
create policy "Users can insert their own flight logs"
  on flight_logs for insert
  with check (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 로그를 수정할 수 있음
create policy "Users can update their own flight logs"
  on flight_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 로그를 삭제할 수 있음
create policy "Users can delete their own flight logs"
  on flight_logs for delete
  using (auth.uid() = user_id);
