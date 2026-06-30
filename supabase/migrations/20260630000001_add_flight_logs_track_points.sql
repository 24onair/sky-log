-- flight_logs.track_points 컬럼 추가 (지도 리플레이용 경로 좌표)
--
-- IGC 파싱 시 샘플링한 [lon, lat, alt][] 배열을 JSONB로 저장한다.
-- IGCUploader / logbook 신규·상세 화면, FlightReplay 가 사용한다.
-- 운영 DB에 이미 존재하던 컬럼을 마이그레이션으로 역기록. IF NOT EXISTS 로 안전.

alter table flight_logs
  add column if not exists track_points jsonb;
