export type TurnPhase = 'picking' | 'drawing' | 'guessing' | 'complete'
export type GameStatus = 'active' | 'abandoned'

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
  phase: TurnPhase
  created_at: string
}
