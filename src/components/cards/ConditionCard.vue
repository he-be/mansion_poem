<template>
  <div
    :class="['condition-card', { 'condition-card--selected': isSelected }]"
    @click="handleClick"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
  >
    <div class="condition-card__category">{{ card.category }}</div>
    <div class="condition-card__text">{{ card.condition_text }}</div>
    <div v-if="isSelected" class="condition-card__check">✓</div>
  </div>
</template>

<script setup lang="ts">
import type { ConditionCard } from '@/types/card'

interface Props {
  card: ConditionCard
  isSelected: boolean
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
.condition-card {
  position: relative;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background-color: #f7fafc;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.condition-card:hover {
  border-color: #cbd5e0;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.condition-card--selected {
  background-color: #e6ffed;
  border-color: #48bb78;
}

.condition-card__category {
  font-size: 0.875rem;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
}

.condition-card__text {
  font-size: 1.1rem;
  font-weight: 500;
  color: #2d3748;
  flex: 1;
}

.condition-card__check {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  background-color: #48bb78;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
}

@media (max-width: 768px) {
  .condition-card {
    min-height: 100px;
    padding: 1rem;
  }

  .condition-card__text {
    font-size: 1rem;
  }
}
</style>
