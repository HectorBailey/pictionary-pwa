export type TurnPhase = 'picking' | 'drawing' | 'guessing' | 'complete'
export type GameStatus = 'active' | 'abandoned'

export interface Profile {
  id: string
  display_name: string
  emoji_code: string
  created_at: string
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
  guessed_correctly: boolean | null
  phase: TurnPhase
  created_at: string
}
