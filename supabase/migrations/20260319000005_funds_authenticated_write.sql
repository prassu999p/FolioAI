-- Allow authenticated users to insert and update funds (shared master table)
CREATE POLICY "Authenticated users can insert funds"
  ON funds FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update funds"
  ON funds FOR UPDATE TO authenticated USING (true);
