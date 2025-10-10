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
})
