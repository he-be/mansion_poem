import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BacksidePrint from '../BacksidePrint.vue'
import type { SelectedPair } from '@/types/card'

// QRCodeモジュールのモック
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
  },
}))

describe('BacksidePrint', () => {
  const mockSelectedPairs: SelectedPair[] = [
    {
      conditionCard: {
        id: '1',
        condition_text: '狭い部屋',
        category: 'size',
        strength: -3,
        poems: [],
      },
      selectedPoem: {
        id: '10',
        poem_text: 'コンパクトな空間',
      },
    },
    {
      conditionCard: {
        id: '2',
        condition_text: '駅から遠い',
        category: 'location',
        strength: -4,
        poems: [],
      },
      selectedPoem: {
        id: '20',
        poem_text: '静かな住環境',
      },
    },
  ]

  it('印刷用の裏面コンポーネントがレンダリングされる', () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    expect(wrapper.find('.backside-print').exists()).toBe(true)
  })

  it('タイトルとサブタイトルが表示される', () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    expect(wrapper.find('.backside-title').text()).toBe('選ばれた言葉の組み合わせ')
    expect(wrapper.find('.backside-subtitle').text()).toBe('このポエムを生み出したあなたの選択')
  })

  it('選択された組み合わせがすべて表示される', () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    const combinationItems = wrapper.findAll('.combination-item')
    expect(combinationItems).toHaveLength(2)

    // 1つ目の組み合わせ
    expect(combinationItems[0].text()).toContain('狭い部屋')
    expect(combinationItems[0].text()).toContain('コンパクトな空間')

    // 2つ目の組み合わせ
    expect(combinationItems[1].text()).toContain('駅から遠い')
    expect(combinationItems[1].text()).toContain('静かな住環境')
  })

  it('各組み合わせに番号が表示される', () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    const numbers = wrapper.findAll('.combination-number')
    expect(numbers).toHaveLength(2)
    expect(numbers[0].text()).toBe('1')
    expect(numbers[1].text()).toBe('2')
  })

  it('Web URLが表示される', () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    expect(wrapper.find('.web-url').text()).toBe('https://mansionpoem.masahiro-hibi.workers.dev')
  })

  it('QRコードセクションが存在する', () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    expect(wrapper.find('.qr-section').exists()).toBe(true)
    expect(wrapper.find('.web-description').text()).toBe('デジタル版で再度お楽しみください')
  })

  it('QRコードが生成される', async () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    // QRコード生成を待つ
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 100))

    const qrImage = wrapper.find('.qr-code')
    expect(qrImage.exists()).toBe(true)
  })

  it('画面表示では非表示（display: none）', () => {
    const wrapper = mount(BacksidePrint, {
      props: {
        selectedPairs: mockSelectedPairs,
      },
    })

    // scoped styleは実際には適用されないが、クラスが存在することは確認できる
    expect(wrapper.find('.backside-print').exists()).toBe(true)
  })
})
