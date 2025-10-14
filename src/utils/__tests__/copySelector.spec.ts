import { describe, it, expect, beforeEach, vi } from 'vitest'
import { selectRandomCatchphrases } from '../copySelector'

describe('copySelector', () => {
  // テスト用に30個のキャッチコピーを用意
  const allCatchphrases = Array.from({ length: 30 }, (_, i) => `キャッチコピー${i + 1}`)

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns exactly 20 catchphrases', () => {
    const result = selectRandomCatchphrases(allCatchphrases)
    expect(result).toHaveLength(20)
  })

  it('returns fewer items if input has less than 20', () => {
    const smallList = ['A', 'B', 'C']
    const result = selectRandomCatchphrases(smallList)
    expect(result).toHaveLength(3)
    expect(result).toEqual(expect.arrayContaining(smallList))
  })

  it('returns all items from input array', () => {
    const result = selectRandomCatchphrases(allCatchphrases)
    result.forEach((item) => {
      expect(allCatchphrases).toContain(item)
    })
  })

  it('does not contain duplicates', () => {
    const result = selectRandomCatchphrases(allCatchphrases)
    const uniqueResult = [...new Set(result)]
    expect(result).toHaveLength(uniqueResult.length)
  })

  it('returns different results on multiple calls (probabilistic)', () => {
    const results1 = selectRandomCatchphrases(allCatchphrases)
    const results2 = selectRandomCatchphrases(allCatchphrases)

    // 完全に同じ順序になる確率は極めて低い
    const sameOrder = results1.every((item, index) => item === results2[index])
    expect(sameOrder).toBe(false)
  })

  it('handles empty array gracefully', () => {
    const result = selectRandomCatchphrases([])
    expect(result).toHaveLength(0)
  })

  it('can be mocked for deterministic testing', () => {
    // Math.randomをモックして決定的なテストを可能にする
    vi.spyOn(Math, 'random').mockImplementation(() => {
      // Fisher-Yatesアルゴリズムのため、順番に0.5を返す
      return 0.5
    })

    const result = selectRandomCatchphrases(allCatchphrases)
    expect(result).toHaveLength(20)
  })
})
