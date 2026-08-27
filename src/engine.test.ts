import { describe, expect, it } from 'vitest'
import { questions } from './data'
import { calculateResult, calculateTraitScores } from './engine'
import type { ResponseStyle } from './types'

describe('quiz engine', () => {
  it('ships a complete 24-question quiz with four choices each', () => {
    expect(questions).toHaveLength(24)
    questions.forEach((question, index) => {
      expect(question.id).toBe(index + 1)
      expect(question.options).toHaveLength(4)
      expect(question.options.map((option) => option.key)).toEqual(['A', 'B', 'C', 'D'])
    })
  })

  it('normalizes trait values to a readable percentage range', () => {
    const scores = calculateTraitScores(['strategist', 'builder', 'connector'])
    Object.values(scores).forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(36)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  it('returns deterministic primary and secondary personas', () => {
    const answers = Array<ResponseStyle>(24).fill('strategist')
    const first = calculateResult(answers)
    const second = calculateResult(answers)

    expect(first.persona.id).toBe(second.persona.id)
    expect(first.secondary.id).not.toBe(first.persona.id)
    expect(first.match).toBeGreaterThanOrEqual(72)
    expect(first.match).toBeLessThanOrEqual(98)
  })
})
