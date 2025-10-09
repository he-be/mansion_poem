<template>
  <div class="game-view">
    <div class="game-container">
      <header class="game-header">
        <h1 class="game-title">言葉の選択</h1>
        <p class="game-instruction">
          五つの条件から、心に響く言葉を選ぶ。<br />
          <span class="selection-status">{{ selectedCount }}/5 の物語が選ばれました。</span>
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
        <LoadingSpinner
          v-if="gameStore.isGeneratingPoem"
          message="ポエムを生成中..."
        />
        <AppButton
          v-else
          label="物語を完成させる"
          :disabled="!gameStore.isAllSelected || gameStore.isGeneratingPoem"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import type { ConditionCard } from '@/types/card'
import CardHand from '@/components/cards/CardHand.vue'
import PoemSelectionModal from '@/components/modals/PoemSelectionModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const gameStore = useGameStore()

const isModalOpen = ref(false)
const selectedCard = ref<ConditionCard | null>(null)

const selectedCount = computed(() => Object.keys(gameStore.selectedPairs).length)

// リロード時にカードが配られていなければスタート画面へ
onMounted(() => {
  if (gameStore.dealtCards.length === 0) {
    router.replace('/')
  }
})

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

const handleGenerateFlyer = async () => {
  await gameStore.generateFlyer()
  router.push('/result')
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #2d2d44 0%, #1a1a2e 50%, #16213e 100%);
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
  font-size: 2.5rem;
  font-weight: 700;
  color: #d4af37;
  margin-bottom: 1.5rem;
  letter-spacing: 0.15em;
  text-shadow: 0 2px 12px rgba(212, 175, 55, 0.5);
}

.game-instruction {
  font-size: 1.2rem;
  color: #f5e6d3;
  margin: 0;
  line-height: 2;
  letter-spacing: 0.05em;
}

.selection-status {
  display: block;
  margin-top: 0.75rem;
  font-size: 1rem;
  color: #d4af37;
  font-style: italic;
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
