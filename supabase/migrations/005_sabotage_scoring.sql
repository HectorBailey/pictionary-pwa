-- Track sabotage on turns
-- sabotage: null = no sabotage, otherwise the sabotage type string
ALTER TABLE turns ADD COLUMN IF NOT EXISTS sabotage text;

-- Track points separately for drawer and guesser
ALTER TABLE turns ADD COLUMN IF NOT EXISTS drawer_points int NOT NULL DEFAULT 0;
ALTER TABLE turns ADD COLUMN IF NOT EXISTS guesser_points int NOT NULL DEFAULT 0;

-- Track whether this turn triggers a sabotage on the next turn
ALTER TABLE turns ADD COLUMN IF NOT EXISTS triggers_sabotage boolean NOT NULL DEFAULT false;
