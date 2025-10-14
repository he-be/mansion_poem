import { describe, it, expect, beforeEach, vi } from 'vitest'
import { selectRandomBackground, BACKGROUND_IMAGES } from '../backgroundSelector'

describe('backgroundSelector', () => {
  beforeEach(() => {
    // ランダム性をテストのためにリセット
    vi.restoreAllMocks()
  })

  it('returns a valid background image path', () => {
    const result = selectRandomBackground()
    expect(result).toMatch(/^\/img\/bg_\d+\.png$/)
  })

  it('returns one of the available backgrounds', () => {
    const result = selectRandomBackground()
    expect(BACKGROUND_IMAGES).toContain(result)
  })

  it('background images list has correct length', () => {
    // bg_1.png から bg_13.png まで
    expect(BACKGROUND_IMAGES).toHaveLength(13)
  })

  it('all backgrounds have correct format', () => {
    BACKGROUND_IMAGES.forEach((bg) => {
      expect(bg).toMatch(/^\/img\/bg_\d+\.png$/)
    })
  })

  it('returns different results on multiple calls (probabilistic)', () => {
    const results = new Set<string>()
    // 100回呼び出して、少なくとも5種類以上の結果が得られることを確認
    for (let i = 0; i < 100; i++) {
      results.add(selectRandomBackground())
    }
    expect(results.size).toBeGreaterThan(5)
  })

  it('can be mocked for deterministic testing', () => {
    // Math.randomをモックして決定的なテストを可能にする
    vi.spyOn(Math, 'random').mockReturnValue(0) // 常に最初の要素
    const result = selectRandomBackground()
    expect(result).toBe(BACKGROUND_IMAGES[0])
  })
})
