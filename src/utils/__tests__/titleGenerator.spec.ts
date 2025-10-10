import { describe, it, expect } from 'vitest'
import { generateTitle } from '../titleGenerator'
import type { SelectedPair } from '@/types/card'

describe('titleGenerator', () => {
  const createMockPair = (category: string, poemText: string): SelectedPair => ({
    conditionCard: {
      id: 'card-1',
      category,
      condition_text: 'テスト条件',
      strength: -3,
      poems: [],
    },
    selectedPoem: {
      id: 'poem-1',
      poem_text: poemText,
    },
  })

  it('returns default title when no pairs selected', () => {
    const title = generateTitle([])
    expect(title).toBe('あなただけの物語。')
  })

  it('uses poem text as title for single pair', () => {
    const pairs = [createMockPair('周辺環境', 'テストポエム')]
    const title = generateTitle(pairs)
    expect(title).toBe('テストポエム')
  })

  it('prioritizes 周辺環境 category', () => {
    const pairs = [
      createMockPair('室内・仕様', 'ポエムA'),
      createMockPair('周辺環境', 'ポエムB'),
      createMockPair('交通アクセス', 'ポエムC'),
    ]
    const title = generateTitle(pairs)
    expect(title).toBe('ポエムB') // 周辺環境が最優先
  })

  it('prioritizes 交通アクセス over 室内・仕様', () => {
    const pairs = [
      createMockPair('室内・仕様', 'ポエムA'),
      createMockPair('交通アクセス', 'ポエムB'),
    ]
    const title = generateTitle(pairs)
    expect(title).toBe('ポエムB') // 交通アクセスの方が優先度高い
  })

  it('uses first pair for unknown categories', () => {
    const pairs = [
      createMockPair('未知のカテゴリ1', 'ポエムA'),
      createMockPair('未知のカテゴリ2', 'ポエムB'),
    ]
    const title = generateTitle(pairs)
    expect(title).toBe('ポエムA') // 優先度が同じなので最初のペア
  })

  it('handles complex priority ordering', () => {
    const pairs = [
      createMockPair('立地・アドレス', 'ポエムA'),
      createMockPair('室内・仕様', 'ポエムB'),
      createMockPair('交通アクセス', 'ポエムC'),
      createMockPair('周辺環境', 'ポエムD'),
      createMockPair('眺望・日照', 'ポエムE'),
    ]
    const title = generateTitle(pairs)
    expect(title).toBe('ポエムD') // 周辺環境が最優先
  })
})
