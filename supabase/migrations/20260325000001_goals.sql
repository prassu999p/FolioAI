CREATE TABLE goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id      UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  NUMERIC(16, 2) NOT NULL CHECK (target_amount > 0),
  target_date    DATE NOT NULL,
  assumed_cagr   NUMERIC(5, 2) NOT NULL DEFAULT 12
                 CHECK (assumed_cagr >= 0 AND assumed_cagr <= 50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select" ON goals FOR SELECT USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "goals_update" ON goals FOR UPDATE USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "goals_delete" ON goals FOR DELETE USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);

CREATE TABLE goal_holdings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  scheme_code INTEGER NOT NULL REFERENCES funds(scheme_code),
  UNIQUE (goal_id, scheme_code)
);

ALTER TABLE goal_holdings ENABLE ROW LEVEL SECURITY;

-- Three-hop RLS: goal_holdings -> goals -> holders -> families
CREATE POLICY "goal_holdings_select" ON goal_holdings FOR SELECT USING (
  goal_id IN (
    SELECT id FROM goals WHERE holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "goal_holdings_insert" ON goal_holdings FOR INSERT WITH CHECK (
  goal_id IN (
    SELECT id FROM goals WHERE holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "goal_holdings_delete" ON goal_holdings FOR DELETE USING (
  goal_id IN (
    SELECT id FROM goals WHERE holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  )
);
