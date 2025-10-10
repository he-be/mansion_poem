import { describe, it, expect, vi } from 'vitest'
import { selectRandomCards } from '../cardSelector'
import type { ConditionCard } from '@/types/card'

describe('cardSelector', () => {
  const createMockCard = (id: string, category: string, strength: number): ConditionCard => ({
    id,
    category,
    condition_text: `条件${id}`,
    strength,
    poems: [
      { id: `${id}-a`, poem_text: `ポエム${id}A` },
      { id: `${id}-b`, poem_text: `ポエム${id}B` },
    ],
  })

  it('selects correct number of cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      createMockCard(`card-${i}`, `category-${i}`, -3)
    )
    const selected = selectRandomCards(cards, 5)
    expect(selected).toHaveLength(5)
  })

  it('throws error when insufficient cards', () => {
    const cards = [createMockCard('card-1', 'category-1', -3)]
    expect(() => selectRandomCards(cards, 5)).toThrow('カード数が不足しています')
  })

  it('resolves category conflicts by keeping stronger card', () => {
    // 同じカテゴリで異なる強度のカード
    const cards = [
      createMockCard('card-1', 'same-category', -3),
      createMockCard('card-2', 'same-category', -5), // より強い
      createMockCard('card-3', 'different-category', -2),
      createMockCard('card-4', 'another-category', -4),
      createMockCard('card-5', 'yet-another-category', -3),
      createMockCard('card-6', 'unique-category', -2),
    ]

    // Math.randomをモック化して決定的な結果を得る
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValue(0.5)

    const selected = selectRandomCards(cards, 5)

    expect(selected).toHaveLength(5)

    // カテゴリが重複していないことを確認
    const categories = selected.map(c => c.category)
    const uniqueCategories = new Set(categories)
    expect(uniqueCategories.size).toBe(5)

    mockRandom.mockRestore()
  })

  it('returns cards with unique categories', () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      createMockCard(`card-${i}`, `category-${i % 10}`, -3)
    )
    const selected = selectRandomCards(cards, 5)

    const categories = selected.map(c => c.category)
    const uniqueCategories = new Set(categories)
    expect(uniqueCategories.size).toBe(5)
  })

  it('selects all cards when exactly count cards available', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      createMockCard(`card-${i}`, `category-${i}`, -3)
    )
    const selected = selectRandomCards(cards, 5)
    expect(selected).toHaveLength(5)
  })
})
