import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../gameStore'

describe('gameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with correct default state', () => {
    const store = useGameStore()
    expect(store.currentPhase).toBe('start')
    expect(store.selectedPairsArray).toHaveLength(0)
    expect(store.generatedPoem).toBe('')
    expect(store.generatedTitle).toBe('')
  })

  it('resets state correctly', () => {
    const store = useGameStore()
    store.currentPhase = 'result'
    store.generatedPoem = 'テストポエム'

    store.reset()

    expect(store.currentPhase).toBe('start')
    expect(store.selectedPairsArray).toHaveLength(0)
    expect(store.generatedPoem).toBe('')
  })

  it('starts game correctly', () => {
    const store = useGameStore()
    expect(store.currentPhase).toBe('start')

    store.startGame()
    expect(store.currentPhase).toBe('game')
    expect(store.dealtCards).toHaveLength(5)
  })

  it('selects poem correctly', () => {
    const store = useGameStore()
    store.startGame()

    const firstCard = store.dealtCards[0]
    const firstPoem = firstCard.poems[0]

    store.selectPoem(firstCard.id, firstPoem.id)

    expect(store.selectedPairsArray).toHaveLength(1)
    expect(store.selectedPairs[firstCard.id].selectedPoem).toEqual(firstPoem)
  })

  it('tracks selection completion with isAllSelected getter', () => {
    const store = useGameStore()
    store.startGame()

    expect(store.isAllSelected).toBe(false)

    // 5枚すべて選択
    store.dealtCards.forEach((card) => {
      store.selectPoem(card.id, card.poems[0].id)
    })

    expect(store.isAllSelected).toBe(true)
    expect(store.selectedPairsArray).toHaveLength(5)
  })

  it('allows changing poem selection for same card', () => {
    const store = useGameStore()
    store.startGame()

    const card = store.dealtCards[0]
    const firstPoem = card.poems[0]
    const secondPoem = card.poems[1]

    // 最初のポエムを選択
    store.selectPoem(card.id, firstPoem.id)
    expect(store.selectedPairs[card.id].selectedPoem).toEqual(firstPoem)

    // 別のポエムに変更
    store.selectPoem(card.id, secondPoem.id)
    expect(store.selectedPairs[card.id].selectedPoem).toEqual(secondPoem)
    expect(store.selectedPairsArray).toHaveLength(1)
  })

  it('initializes with correct phase', () => {
    const store = useGameStore()
    expect(store.currentPhase).toBe('start')
    expect(store.isGeneratingPoem).toBe(false)
    expect(store.poemGenerationError).toBe(null)
  })
})
