<template>
  <button
    :class="['app-button', `app-button--${variant}`, { 'app-button--disabled': disabled }]"
    :disabled="disabled"
    @click="handleClick"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
interface Props {
  label: string
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  variant: 'primary',
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}
</script>

<style scoped>
.app-button {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.app-button--primary {
  background-color: #4a5568;
  color: white;
}

.app-button--primary:hover:not(.app-button--disabled) {
  background-color: #2d3748;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.app-button--secondary {
  background-color: #e2e8f0;
  color: #2d3748;
}

.app-button--secondary:hover:not(.app-button--disabled) {
  background-color: #cbd5e0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.app-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
