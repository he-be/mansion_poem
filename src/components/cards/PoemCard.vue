<template>
  <div
    class="poem-card"
    @click="handleClick"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
  >
    <p class="poem-card__text">{{ poem.poem_text }}</p>
  </div>
</template>

<script setup lang="ts">
import type { PoemOption } from '@/types/card'

interface Props {
  poem: PoemOption
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.poem-card {
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poem-card:hover {
  border-color: #4a5568;
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.poem-card__text {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #2d3748;
  text-align: center;
  margin: 0;
}

@media (max-width: 768px) {
  .poem-card {
    padding: 1rem;
    min-height: 80px;
  }

  .poem-card__text {
    font-size: 1rem;
  }
}
</style>
