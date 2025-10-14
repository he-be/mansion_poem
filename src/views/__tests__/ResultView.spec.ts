import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultView from '../ResultView.vue'
import { setupResultViewState, createMockRouter } from '@/test-utils/testHelpers'
import { createMockGameState } from '@/test-utils/mockFactories'
import type { LayoutStyle } from '@/types/layout'

// ルーターをモック化
vi.mock('vue-router', () => ({
  useRouter: () => createMockRouter(),
}))

describe('ResultView', () => {
  beforeEach(() => {
    // 各テスト前にモックをクリア
    vi.clearAllMocks()
  })

  it('renders generated title and poem', () => {
    // UI操作なしで結果画面の状態を直接セットアップ
    const mockState = createMockGameState()
    const { pinia } = setupResultViewState(mockState)

    const wrapper = mount(ResultView, {
      global: {
        plugins: [pinia],
      },
    })

    // タイトルとポエムが表示されることを確認
    expect(wrapper.text()).toContain(mockState.generatedTitle)
    expect(wrapper.text()).toContain(mockState.generatedPoem)
  })

  it('displays selected pairs in side menu when opened', async () => {
    const mockState = createMockGameState()
    const { pinia } = setupResultViewState(mockState)

    const wrapper = mount(ResultView, {
      global: {
        plugins: [pinia],
      },
    })

    // メニュートグルボタンをクリック
    const menuToggle = wrapper.find('.menu-toggle')
    await menuToggle.trigger('click')

    // サイドメニューが表示される
    expect(wrapper.find('.side-menu').exists()).toBe(true)

    // 選択されたペアが表示される
    mockState.selectedPairs.forEach((pair) => {
      expect(wrapper.text()).toContain(pair.conditionCard.condition_text)
      expect(wrapper.text()).toContain(pair.selectedPoem.poem_text)
    })
  })

  it('toggles menu when clicking menu button', async () => {
    const mockState = createMockGameState()
    const { pinia } = setupResultViewState(mockState)

    const wrapper = mount(ResultView, {
      global: {
        plugins: [pinia],
      },
    })

    // 初期状態ではメニューは閉じている
    expect(wrapper.find('.side-menu').exists()).toBe(false)

    // メニュートグルボタンをクリック
    const menuToggle = wrapper.find('.menu-toggle')
    await menuToggle.trigger('click')

    // メニューが開く
    expect(wrapper.find('.side-menu').exists()).toBe(true)

    // もう一度クリック
    await menuToggle.trigger('click')

    // メニューが閉じる
    expect(wrapper.find('.side-menu').exists()).toBe(false)
  })

  it('calls reset and navigates to home when restart button clicked', async () => {
    const mockState = createMockGameState()
    const { pinia, store } = setupResultViewState(mockState)

    const wrapper = mount(ResultView, {
      global: {
        plugins: [pinia],
      },
    })

    // メニューを開く
    const menuToggle = wrapper.find('.menu-toggle')
    await menuToggle.trigger('click')

    // 「もう一度創造する」ボタンをクリック
    const restartButton = wrapper.find('.menu-footer button')
    await restartButton.trigger('click')

    // ストアがリセットされることを確認
    expect(store.currentPhase).toBe('start')
    expect(store.generatedPoem).toBe('')
  })

  it('shows background image element', () => {
    const mockState = createMockGameState()
    const { pinia } = setupResultViewState(mockState)

    const wrapper = mount(ResultView, {
      global: {
        plugins: [pinia],
      },
    })

    // 背景画像要素が存在することを確認
    expect(wrapper.find('.background-image').exists()).toBe(true)
  })

  it('shows poem overlay with correct structure', () => {
    const mockState = createMockGameState()
    const { pinia } = setupResultViewState(mockState)

    const wrapper = mount(ResultView, {
      global: {
        plugins: [pinia],
      },
    })

    // ポエムオーバーレイが存在
    const overlay = wrapper.find('.poem-overlay')
    expect(overlay.exists()).toBe(true)

    // タイトルとテキストが含まれる
    expect(overlay.find('.poem-title').exists()).toBe(true)
    expect(overlay.find('.poem-text').exists()).toBe(true)
  })

  describe('Layout Style Support', () => {
    it('accepts layoutStyle prop with default value A', () => {
      const mockState = createMockGameState()
      const { pinia } = setupResultViewState(mockState)

      const wrapper = mount(ResultView, {
        global: {
          plugins: [pinia],
        },
      })

      // デフォルトでスタイルAが使われることを確認
      expect(wrapper.vm.layoutStyle).toBe('A')
    })

    it('accepts layoutStyle prop and renders appropriate layout', () => {
      const mockState = createMockGameState()
      const { pinia } = setupResultViewState(mockState)

      const layoutStyles: LayoutStyle[] = ['A', 'B', 'C']

      layoutStyles.forEach((style) => {
        const wrapper = mount(ResultView, {
          props: {
            layoutStyle: style,
          },
          global: {
            plugins: [pinia],
          },
        })

        // layoutStyleプロパティが正しく設定されることを確認
        expect(wrapper.vm.layoutStyle).toBe(style)
      })
    })

    it('renders LayoutA component when layoutStyle is A', () => {
      const mockState = createMockGameState()
      const { pinia } = setupResultViewState(mockState)

      const wrapper = mount(ResultView, {
        props: {
          layoutStyle: 'A',
        },
        global: {
          plugins: [pinia],
        },
      })

      // LayoutAコンポーネントが含まれることを確認
      expect(wrapper.findComponent({ name: 'LayoutA' }).exists()).toBe(true)
    })

    it('renders LayoutB component when layoutStyle is B', () => {
      const mockState = createMockGameState()
      const { pinia } = setupResultViewState(mockState)

      const wrapper = mount(ResultView, {
        props: {
          layoutStyle: 'B',
        },
        global: {
          plugins: [pinia],
        },
      })

      // LayoutBコンポーネントが含まれることを確認
      expect(wrapper.findComponent({ name: 'LayoutB' }).exists()).toBe(true)
    })

    it('renders LayoutC component when layoutStyle is C', () => {
      const mockState = createMockGameState()
      const { pinia } = setupResultViewState(mockState)

      const wrapper = mount(ResultView, {
        props: {
          layoutStyle: 'C',
        },
        global: {
          plugins: [pinia],
        },
      })

      // LayoutCコンポーネントが含まれることを確認
      expect(wrapper.findComponent({ name: 'LayoutC' }).exists()).toBe(true)
    })
  })
})
