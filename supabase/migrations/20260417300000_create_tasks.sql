-- Tasks table for XC paragliding task planning
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL DEFAULT '새 타스크',
  task_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  task_type   TEXT NOT NULL DEFAULT 'RACE'
              CHECK (task_type IN ('RACE', 'CLASSIC', 'FAI')),
  is_public   BOOLEAN NOT NULL DEFAULT false,
  waypoints   JSONB NOT NULL DEFAULT '[]'::jsonb,
  distance_km FLOAT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Public tasks are visible to everyone; private tasks only to their owner
CREATE POLICY "tasks_select"
  ON tasks FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();
