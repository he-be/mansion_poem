<template>
  <div class="game-view">
    <div class="game-container">
      <header class="game-header">
        <h1 class="game-title">カードを選んでください</h1>
        <p class="game-instruction">
          各条件カードをクリックして、ポエムを選択してください（5枚中{{ selectedCount }}枚選択済み）
        </p>
      </header>

      <div class="game-content">
        <CardHand
          :cards="gameStore.dealtCards"
          :selected-pair-ids="Object.keys(gameStore.selectedPairs)"
          @card-click="handleCardClick"
        />
      </div>

      <footer class="game-footer">
        <AppButton
          label="チラシを生成する"
          :disabled="!gameStore.isAllSelected"
          @click="handleGenerateFlyer"
        />
      </footer>
    </div>

    <PoemSelectionModal
      :is-open="isModalOpen"
      :condition-card="selectedCard"
      @close="handleModalClose"
      @poem-selected="handlePoemSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import type { ConditionCard } from '@/types/card'
import CardHand from '@/components/cards/CardHand.vue'
import PoemSelectionModal from '@/components/modals/PoemSelectionModal.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const gameStore = useGameStore()

const isModalOpen = ref(false)
const selectedCard = ref<ConditionCard | null>(null)

const selectedCount = computed(() => Object.keys(gameStore.selectedPairs).length)

const handleCardClick = (cardId: string) => {
  const card = gameStore.dealtCards.find((c) => c.id === cardId)
  if (card) {
    selectedCard.value = card
    isModalOpen.value = true
  }
}

const handleModalClose = () => {
  isModalOpen.value = false
  selectedCard.value = null
}

const handlePoemSelected = (poemId: string) => {
  if (selectedCard.value) {
    gameStore.selectPoem(selectedCard.value.id, poemId)
  }
}

const handleGenerateFlyer = () => {
  gameStore.generateFlyer()
  router.push('/result')
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background-color: #f7fafc;
  padding: 2rem;
}

.game-container {
  max-width: 1400px;
  margin: 0 auto;
}

.game-header {
  text-align: center;
  margin-bottom: 3rem;
}

.game-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 1rem;
}

.game-instruction {
  font-size: 1.1rem;
  color: #718096;
  margin: 0;
}

.game-content {
  margin-bottom: 3rem;
}

.game-footer {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .game-view {
    padding: 1rem;
  }

  .game-header {
    margin-bottom: 2rem;
  }

  .game-title {
    font-size: 1.5rem;
  }

  .game-instruction {
    font-size: 1rem;
  }

  .game-content {
    margin-bottom: 2rem;
  }
}
</style>
