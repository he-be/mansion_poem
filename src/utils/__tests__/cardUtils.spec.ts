import { describe, it, expect } from 'vitest'

/**
 * カード選択ロジックのテスト用ユーティリティ
 */
function selectRandomCards<T>(cards: T[], count: number): T[] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

describe('cardUtils', () => {
  it('selects correct number of random cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({ id: i }))
    const selected = selectRandomCards(cards, 5)
    expect(selected).toHaveLength(5)
  })

  it('returns unique cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({ id: i }))
    const selected = selectRandomCards(cards, 5)
    const ids = selected.map((c) => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(5)
  })

  it('handles edge case when count equals card length', () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({ id: i }))
    const selected = selectRandomCards(cards, 5)
    expect(selected).toHaveLength(5)
  })
})
