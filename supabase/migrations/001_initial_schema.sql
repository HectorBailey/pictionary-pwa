-- Emoji pool for generating unique codes
CREATE OR REPLACE FUNCTION generate_emoji_code()
RETURNS text AS $$
DECLARE
  emojis text[] := ARRAY[
    '🐙','🌵','🎸','🦊','🌈','🎲','🦋','🌻','🎭','🐢',
    '🦄','🌮','🎪','🐳','🍄','🎨','🦜','🌸','🎯','🐝',
    '🦕','🍕','🎻','🐧','🌺','🎹','🦀','🍩','🎬','🐨',
    '🦎','🍉','🎺','🐬','🌷','🎰','🦚','🍓','🎼','🐌',
    '🦥','🍋','🎵','🐠','🌴','🎤','🦩','🍒','🎡','🐛'
  ];
  code text;
  attempts int := 0;
BEGIN
  LOOP
    code := emojis[1 + floor(random() * array_length(emojis, 1))::int]
         || emojis[1 + floor(random() * array_length(emojis, 1))::int]
         || emojis[1 + floor(random() * array_length(emojis, 1))::int];
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE emoji_code = code) THEN
      RETURN code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique emoji code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  emoji_code text UNIQUE NOT NULL DEFAULT generate_emoji_code(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Games table
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own games"
  ON games FOR SELECT
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Authenticated users can create games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update own games"
  ON games FOR UPDATE
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Turns table
CREATE TABLE turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  turn_number int NOT NULL,
  drawer_id uuid NOT NULL REFERENCES profiles(id),
  guesser_id uuid NOT NULL REFERENCES profiles(id),
  word text,
  word_options text[] NOT NULL DEFAULT '{}',
  strokes jsonb NOT NULL DEFAULT '[]',
  guess text,
  guessed_correctly boolean,
  phase text NOT NULL DEFAULT 'picking' CHECK (phase IN ('picking', 'drawing', 'guessing', 'complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, turn_number)
);

ALTER TABLE turns ENABLE ROW LEVEL SECURITY;

-- Drawer can see everything, guesser cannot see the word until phase is complete
CREATE POLICY "Drawer can view turn"
  ON turns FOR SELECT
  TO authenticated
  USING (auth.uid() = drawer_id);

CREATE POLICY "Guesser can view turn (word hidden until complete)"
  ON turns FOR SELECT
  TO authenticated
  USING (
    auth.uid() = guesser_id
  );

CREATE POLICY "Players can insert turns for their games"
  ON turns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_id
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

CREATE POLICY "Drawer can update turn"
  ON turns FOR UPDATE
  TO authenticated
  USING (auth.uid() = drawer_id);

CREATE POLICY "Guesser can update guess fields"
  ON turns FOR UPDATE
  TO authenticated
  USING (auth.uid() = guesser_id);

-- Create a view that hides word from guesser until turn is complete
CREATE OR REPLACE FUNCTION get_turn_for_user(turn_row turns)
RETURNS jsonb AS $$
BEGIN
  IF turn_row.guesser_id = auth.uid() AND turn_row.phase != 'complete' THEN
    RETURN to_jsonb(turn_row) - 'word' - 'word_options';
  END IF;
  RETURN to_jsonb(turn_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE turns;

-- Index for game lookups
CREATE INDEX idx_games_player1 ON games(player1_id);
CREATE INDEX idx_games_player2 ON games(player2_id);
CREATE INDEX idx_turns_game ON turns(game_id, turn_number DESC);
