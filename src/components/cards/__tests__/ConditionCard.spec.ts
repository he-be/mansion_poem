import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConditionCard from '../ConditionCard.vue'
import type { ConditionCard as ConditionCardType } from '@/types/card'

describe('ConditionCard', () => {
  const mockCard: ConditionCardType = {
    id: 'card-001',
    category: 'テストカテゴリ',
    condition_text: 'テスト条件',
    strength: -3,
    poems: [],
  }

  it('renders card with correct content', () => {
    const wrapper = mount(ConditionCard, {
      props: {
        card: mockCard,
        isSelected: false,
      },
    })
    expect(wrapper.text()).toContain('テストカテゴリ')
    expect(wrapper.text()).toContain('テスト条件')
  })

  it('shows check mark when selected', () => {
    const wrapper = mount(ConditionCard, {
      props: {
        card: mockCard,
        isSelected: true,
      },
    })
    expect(wrapper.text()).toContain('✓')
  })

  it('does not show check mark when not selected', () => {
    const wrapper = mount(ConditionCard, {
      props: {
        card: mockCard,
        isSelected: false,
      },
    })
    expect(wrapper.text()).not.toContain('✓')
  })

  it('applies selected class when selected', () => {
    const wrapper = mount(ConditionCard, {
      props: {
        card: mockCard,
        isSelected: true,
      },
    })
    expect(wrapper.classes()).toContain('condition-card--selected')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(ConditionCard, {
      props: {
        card: mockCard,
        isSelected: false,
      },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('emits click event on enter key', async () => {
    const wrapper = mount(ConditionCard, {
      props: {
        card: mockCard,
        isSelected: false,
      },
    })
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
