-- Track how many seconds it took to guess (from animation complete to correct guess)
ALTER TABLE turns ADD COLUMN IF NOT EXISTS guess_time_seconds real;
