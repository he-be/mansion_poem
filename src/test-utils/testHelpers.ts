import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import type { SelectedPair } from '@/types/card'

/**
 * ResultViewのテストに必要な状態を直接セットアップするヘルパー
 * ボタンクリックなどのUI操作を経由せずに、結果画面の状態を作成できる
 */
export function setupResultViewState(options: {
  selectedPairs: SelectedPair[]
  generatedTitle: string
  generatedPoem: string
}) {
  // 新しいPiniaインスタンスを作成
  const pinia = createPinia()
  setActivePinia(pinia)

  // ストアを取得して状態を直接設定
  const store = useGameStore()

  // 選択されたペアを設定
  options.selectedPairs.forEach((pair) => {
    store.selectedPairs[pair.conditionCard.id] = pair
  })

  // 生成されたタイトルとポエムを設定
  store.generatedTitle = options.generatedTitle
  store.generatedPoem = options.generatedPoem

  // 結果画面フェーズに設定
  store.currentPhase = 'result'

  return { pinia, store }
}

/**
 * テスト用のルーターモック
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    currentRoute: {
      value: {
        name: 'result',
        path: '/result',
      },
    },
  }
}
