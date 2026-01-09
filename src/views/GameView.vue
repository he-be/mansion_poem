<template>
  <div class="game-view">
    <div class="game-container">
      <header class="game-header">
        <h1 class="game-title">言葉の選択</h1>
        <p class="game-instruction">
          5つの条件カードをタップして、<br />
          それぞれの「言い換え」を選んでください。<br />
          <span class="selection-status">{{ selectedCount }}/5 選択完了</span>
        </p>
      </header>

      <div class="game-content">
        <CardHand
          :cards="gameStore.dealtCards"
          :selected-pair-ids="Object.keys(gameStore.selectedPairs)"
          @card-click="handleCardClick"
        />
      </div>

      <Transition name="fade-slide">
        <footer v-if="showGenerateButton" class="game-footer">
          <button
            class="text-button"
            :disabled="!gameStore.isAllSelected || gameStore.isGeneratingPoem"
            @click="handleGenerateFlyer"
          >
            {{ gameStore.isGeneratingPoem ? '生成中...' : '広告を生成する' }}
          </button>
        </footer>
      </Transition>

      <Transition name="slide-up">
        <!-- Streaming Area (Expanded) -->
        <div v-if="!showGenerateButton && gameStore.isGeneratingPoem" class="streaming-area expanded">
           <StreamingGrid />
        </div>
      </Transition>

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
import StreamingGrid from '@/components/common/StreamingGrid.vue'

const router = useRouter()
const gameStore = useGameStore()

const isModalOpen = ref(false)
const selectedCard = ref<ConditionCard | null>(null)
const showGenerateButton = ref(true)

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
  // 生成開始（ボタンのテキストが「生成中...」に変わる）
  const generationPromise = gameStore.generateFlyer()
  
  // ユーザーが「生成中...」を確認できるよう少し待つ
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // ボタンを消してストリーミングエリアを表示
  showGenerateButton.value = false
  
  // 生成完了まで待機
  await generationPromise
  
  // 結果画面へ遷移
  router.push('/result')
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #2d2d44 0%, #1a1a2e 50%, #16213e 100%);
  padding: 2rem;
  padding-bottom: 4rem;
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
  font-size: 1.1rem;
  color: #d4af37;
  font-weight: bold;
}

.game-content {
  margin-bottom: 3rem;
}

.game-footer {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  height: 80px; /* 固定高さを確保してTransition時のレイアウト崩れを防ぐ */
}

.streaming-area {
  width: 100%;
}

.streaming-area.expanded {
  height: 600px; /* 元の300pxの2倍 */
  margin-top: -2rem; /* フッターのマージン分などを調整 */
}

/* Button Fade/Slide Out */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Streaming Area Slide Up */
.slide-up-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); /* 自然なスライドイン */
}

.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100px); /* 下から入ってくる */
}

.slide-up-enter-to {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 768px) {
  /* Existing media queries... */
  .game-view {
    padding: 1rem;
  }
  
  .game-title {
    font-size: 1.8rem;
  }
}
</style>
