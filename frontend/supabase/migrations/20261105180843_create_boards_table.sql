/*
# Create boards table for Whiteboard app (single-tenant, no auth)

1. New Tables
- `boards`
  - `id` (uuid, primary key, auto-generated)
  - `title` (text, not null) — user-given name for the saved board
  - `thumbnail` (text, nullable) — base64 data URL preview image
  - `canvas_data` (jsonb, not null) — serialized shapes, paths, text, and relationships
  - `category` (text, nullable) — tag like 'LLD', 'HLD', 'Custom'
  - `created_at` (timestamptz, defaults to now)
  - `updated_at` (timestamptz, defaults to now)

2. Security
- Enable RLS on `boards`.
- Grant CRUD to `anon` + `authenticated` so the Data API can reach the table.
- Allow anon + authenticated full CRUD because the data is intentionally shared/public (no sign-in screen).

3. Notes
- This is a single-tenant app with no authentication. All boards are public.
- `canvas_data` stores the full serialized state of the whiteboard.
- `thumbnail` stores a small PNG preview for the board gallery.
*/

CREATE TABLE IF NOT EXISTS boards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  thumbnail   text,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  category    text DEFAULT 'Custom',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON boards TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_boards" ON boards;
CREATE POLICY "anon_select_boards"
  ON boards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_boards" ON boards;
CREATE POLICY "anon_insert_boards"
  ON boards FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_boards" ON boards;
CREATE POLICY "anon_update_boards"
  ON boards FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_boards" ON boards;
CREATE POLICY "anon_delete_boards"
  ON boards FOR DELETE
  TO anon, authenticated USING (true);
