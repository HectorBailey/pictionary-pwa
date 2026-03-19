-- Track who the sabotage is aimed at (the drawer from the turn where it was triggered)
ALTER TABLE turns ADD COLUMN IF NOT EXISTS sabotage_target_id uuid REFERENCES profiles(id);
