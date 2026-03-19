export type TurnPhase = 'picking' | 'drawing' | 'guessing' | 'complete'
export type GameStatus = 'active' | 'abandoned'
export type SabotageType = 'thick_brush' | 'mirror' | 'no_eraser' | 'speed_round' | 'hard_word' | 'no_colour'

export const SABOTAGE_LABELS: Record<SabotageType, string> = {
  thick_brush: 'THICK BRUSH',
  mirror: 'MIRROR MODE',
  no_eraser: 'NO ERASER',
  speed_round: 'SPEED ROUND',
  hard_word: 'HARD WORD',
  no_colour: 'NO COLOUR',
}

export const SABOTAGE_DESCRIPTIONS: Record<SabotageType, string> = {
  thick_brush: 'Minimum brush size is massive',
  mirror: 'Canvas is flipped horizontally',
  no_eraser: 'No eraser and no undo',
  speed_round: 'Only 15 seconds to draw',
  hard_word: 'Word choices are extra tricky',
  no_colour: 'Black pen only, no colours',
}

export const ALL_SABOTAGES: SabotageType[] = [
  'thick_brush', 'mirror', 'no_eraser', 'speed_round', 'hard_word', 'no_colour',
]

export interface Profile {
  id: string
  display_name: string
  username: string | null
  join_code: string
  emoji_code: string
  created_at: string
}

export interface GameScores {
  player1_wins: number
  player2_wins: number
}

export interface Game {
  id: string
  player1_id: string
  player2_id: string
  status: GameStatus
  created_at: string
  // joined fields
  player1?: Profile
  player2?: Profile
  latest_turn?: Turn
  scores?: GameScores
}

export interface Stroke {
  points: { x: number; y: number }[]
  color: string
  width: number
  tool: 'pen' | 'eraser'
}

export interface Turn {
  id: string
  game_id: string
  turn_number: number
  drawer_id: string
  guesser_id: string
  word: string | null
  word_options: string[]
  strokes: Stroke[]
  guess: string | null
  guesses: string[]
  guesses_remaining: number
  guessed_correctly: boolean | null
  guess_time_seconds: number | null
  points: number
  drawer_points: number
  guesser_points: number
  sabotage: SabotageType | null
  sabotage_target_id: string | null
  triggers_sabotage: boolean
  phase: TurnPhase
  created_at: string
}
