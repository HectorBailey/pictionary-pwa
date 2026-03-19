-- Track points per turn (1 = normal, 2 = guessed during animation)
ALTER TABLE turns ADD COLUMN IF NOT EXISTS points int NOT NULL DEFAULT 0;
