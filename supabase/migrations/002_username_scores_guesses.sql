-- Replace emoji_code with username + short join_code
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_code text;

-- Generate short alphanumeric join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
  attempts int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE join_code = code) THEN
      RETURN code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing profiles with join codes
UPDATE profiles SET join_code = generate_join_code() WHERE join_code IS NULL;

-- Make join_code required and unique
ALTER TABLE profiles ALTER COLUMN join_code SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN join_code SET DEFAULT generate_join_code();
ALTER TABLE profiles ADD CONSTRAINT profiles_join_code_unique UNIQUE (join_code);

-- Change turns: guess -> guesses (array), track remaining guesses
ALTER TABLE turns ADD COLUMN IF NOT EXISTS guesses text[] NOT NULL DEFAULT '{}';
ALTER TABLE turns ADD COLUMN IF NOT EXISTS guesses_remaining int NOT NULL DEFAULT 3;

-- Update handle_new_user to not set display_name (username set by user later)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
