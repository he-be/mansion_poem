<template>
  <div class="card-hand">
    <ConditionCard
      v-for="card in cards"
      :key="card.id"
      :card="card"
      :is-selected="selectedPairIds.includes(card.id)"
      @click="emit('card-click', card.id)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ConditionCard as ConditionCardType } from '@/types/card'
import ConditionCard from './ConditionCard.vue'

interface Props {
  cards: ConditionCardType[]
  selectedPairIds: string[]
}

defineProps<Props>()

const emit = defineEmits<{
  'card-click': [cardId: string]
}>()
</script>

<style scoped>
.card-hand {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .card-hand {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
