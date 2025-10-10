import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PoemCard from '../PoemCard.vue'
import type { PoemOption } from '@/types/card'

describe('PoemCard', () => {
  const mockPoem: PoemOption = {
    id: 'poem-001',
    poem_text: 'テストポエムテキスト',
  }

  it('renders poem text correctly', () => {
    const wrapper = mount(PoemCard, {
      props: {
        poem: mockPoem,
      },
    })
    expect(wrapper.text()).toContain('テストポエムテキスト')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(PoemCard, {
      props: {
        poem: mockPoem,
      },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('emits click event on enter key', async () => {
    const wrapper = mount(PoemCard, {
      props: {
        poem: mockPoem,
      },
    })
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('has correct accessibility attributes', () => {
    const wrapper = mount(PoemCard, {
      props: {
        poem: mockPoem,
      },
    })
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('tabindex')).toBe('0')
  })
})
