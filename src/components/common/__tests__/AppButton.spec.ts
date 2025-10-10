import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '../AppButton.vue'

describe('AppButton', () => {
  it('renders button with label', () => {
    const wrapper = mount(AppButton, {
      props: {
        label: 'テストボタン',
      },
    })
    expect(wrapper.text()).toContain('テストボタン')
  })

  it('applies primary variant class by default', () => {
    const wrapper = mount(AppButton, {
      props: {
        label: 'ボタン',
      },
    })
    expect(wrapper.classes()).toContain('app-button--primary')
  })

  it('applies secondary variant class when specified', () => {
    const wrapper = mount(AppButton, {
      props: {
        label: 'ボタン',
        variant: 'secondary',
      },
    })
    expect(wrapper.classes()).toContain('app-button--secondary')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(AppButton, {
      props: {
        label: 'ボタン',
      },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('applies disabled state', () => {
    const wrapper = mount(AppButton, {
      props: {
        label: 'ボタン',
        disabled: true,
      },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
