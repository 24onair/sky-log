CREATE TABLE IF NOT EXISTS waypoint_sets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL DEFAULT '새 웨이포인트 세트',
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  waypoints   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waypoint_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waypoint_sets_select"
  ON waypoint_sets FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "waypoint_sets_insert"
  ON waypoint_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "waypoint_sets_update"
  ON waypoint_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "waypoint_sets_delete"
  ON waypoint_sets FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_waypoint_sets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER waypoint_sets_updated_at
  BEFORE UPDATE ON waypoint_sets
  FOR EACH ROW EXECUTE FUNCTION update_waypoint_sets_updated_at();
