export const TRAIT_KEYS = [
  'vision',
  'action',
  'order',
  'empathy',
  'insight',
  'resilience',
] as const

export type TraitKey = (typeof TRAIT_KEYS)[number]
export type TraitScores = Record<TraitKey, number>

export type ResponseStyle =
  | 'strategist'
  | 'builder'
  | 'pioneer'
  | 'connector'
  | 'guardian'
  | 'creator'
  | 'scholar'
  | 'adapter'

export interface QuizOption {
  key: 'A' | 'B' | 'C' | 'D'
  text: string
  style: ResponseStyle
}

export interface Question {
  id: number
  scene: string
  text: string
  options: QuizOption[]
}

export interface Persona {
  id: string
  name: string
  era: string
  title: string
  seal: string
  quote: string
  profile: TraitScores
  tags: string[]
  portrait: string
  summary: string
  gift: string
  shadow: string
  action: string
}

export interface QuizResult {
  persona: Persona
  scores: TraitScores
  match: number
  secondary: Persona
}
