import { personas, responseVectors } from './data'
import { TRAIT_KEYS, type QuizResult, type ResponseStyle, type TraitScores } from './types'

const emptyScores = (): TraitScores => ({
  vision: 0,
  action: 0,
  order: 0,
  empathy: 0,
  insight: 0,
  resilience: 0,
})

export function calculateTraitScores(answers: ResponseStyle[]): TraitScores {
  if (answers.length === 0) {
    return emptyScores()
  }

  const totals = answers.reduce((acc, style) => {
    const vector = responseVectors[style]
    TRAIT_KEYS.forEach((trait) => {
      acc[trait] += vector[trait]
    })
    return acc
  }, emptyScores())

  return TRAIT_KEYS.reduce((scores, trait) => {
    const average = totals[trait] / answers.length
    scores[trait] = Math.round(20 + average * 16)
    return scores
  }, emptyScores())
}

function profileDistance(scores: TraitScores, profile: TraitScores): number {
  const squaredDistance = TRAIT_KEYS.reduce(
    (total, trait) => total + (scores[trait] - profile[trait]) ** 2,
    0,
  )
  return Math.sqrt(squaredDistance / TRAIT_KEYS.length)
}

export function calculateResult(answers: ResponseStyle[]): QuizResult {
  const scores = calculateTraitScores(answers)
  const ranked = personas
    .map((persona) => ({
      persona,
      distance: profileDistance(scores, persona.profile),
    }))
    .sort((a, b) => a.distance - b.distance)

  const best = ranked[0]
  const secondary = ranked[1]
  const match = Math.max(72, Math.min(98, Math.round(99 - best.distance * 0.48)))

  return {
    persona: best.persona,
    scores,
    match,
    secondary: secondary.persona,
  }
}
