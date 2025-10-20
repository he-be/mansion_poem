<template>
  <div class="result-view">
    <!-- レイアウトコンポーネント -->
    <LayoutA
      v-if="layoutStyle === 'A'"
      :title="gameStore.generatedTitle"
      :poem="gameStore.generatedPoem"
      :background-image="gameStore.selectedBackground"
    />
    <LayoutB
      v-else-if="layoutStyle === 'B'"
      :title="gameStore.generatedTitle"
      :poem="gameStore.generatedPoem"
      :background-image="gameStore.selectedBackground"
    />
    <LayoutC
      v-else-if="layoutStyle === 'C'"
      :title="gameStore.generatedTitle"
      :poem="gameStore.generatedPoem"
      :background-image="gameStore.selectedBackground"
    />

    <!-- エラー表示 -->
    <div v-if="gameStore.poemGenerationError" class="error-overlay">
      <p>{{ gameStore.poemGenerationError }}</p>
      <AppButton
        label="再生成する"
        variant="secondary"
        @click="handleRetry"
      />
    </div>

    <!-- 右下のメニュートグルボタン -->
    <button class="menu-toggle" @click="isMenuOpen = !isMenuOpen" aria-label="メニュー">
      <span v-if="!isMenuOpen">☰</span>
      <span v-else>✕</span>
    </button>

    <!-- 印刷ボタン -->
    <button class="print-button" @click="handlePrint" aria-label="資料請求">
      📄
    </button>

    <!-- 裏面（印刷時のみ表示） -->
    <BacksidePrint :selected-pairs="gameStore.selectedPairsArray" />

    <!-- スライドメニュー -->
    <Transition name="slide">
      <div v-if="isMenuOpen" class="side-menu">
        <div class="menu-content">
          <h2 class="menu-title">選択した組み合わせ</h2>

          <div class="selected-pairs">
            <div
              v-for="pair in gameStore.selectedPairsArray"
              :key="pair.conditionCard.id"
              class="pair-item"
            >
              <div class="pair-item__condition">
                <span class="pair-item__label">現実</span>
                <p class="pair-item__text">{{ pair.conditionCard.condition_text }}</p>
              </div>
              <div class="pair-item__arrow">→</div>
              <div class="pair-item__poem">
                <span class="pair-item__label">言い換え</span>
                <p class="pair-item__text">{{ pair.selectedPoem.poem_text }}</p>
              </div>
            </div>
          </div>

          <div class="menu-footer">
            <AppButton
              label="もう一度創造する"
              variant="secondary"
              @click="handleRestart"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, withDefaults } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import AppButton from '@/components/common/AppButton.vue'
import LayoutA from '@/components/layouts/LayoutA.vue'
import LayoutB from '@/components/layouts/LayoutB.vue'
import LayoutC from '@/components/layouts/LayoutC.vue'
import BacksidePrint from '@/components/BacksidePrint.vue'
import type { LayoutStyle } from '@/types/layout'

interface Props {
  layoutStyle?: LayoutStyle
}

withDefaults(defineProps<Props>(), {
  layoutStyle: 'A',
})

const router = useRouter()
const gameStore = useGameStore()
const isMenuOpen = ref(false)

// リロード時に生成されたポエムがなければスタート画面へ
onMounted(() => {
  if (!gameStore.generatedPoem) {
    router.replace('/')
  }
})

const handleRestart = () => {
  gameStore.reset()
  router.push('/')
}

const handleRetry = async () => {
  await gameStore.retryPoemGeneration()
}

const handlePrint = () => {
  window.print()
}
</script>

<style scoped>
.result-view {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-y: auto;
  background-color: #000000;
}

/* 印刷時はスクロールバーを消す */
@media print {
  .result-view {
    overflow: visible;
    height: auto;
  }
}

.error-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 200;
  padding: 1.5rem;
  background-color: rgba(254, 215, 215, 0.95);
  border-radius: 8px;
  color: #c53030;
  max-width: 400px;
}

.error-overlay p {
  margin: 0 0 1rem 0;
}

/* メニュートグルボタン */
.menu-toggle {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 100;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4af37 0%, #c9a02c 100%);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5);
}

.menu-toggle:active {
  transform: scale(0.95);
}

/* 印刷ボタン */
.print-button {
  position: fixed;
  bottom: 2rem;
  right: 5.5rem;
  z-index: 100;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.print-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(74, 144, 226, 0.5);
}

.print-button:active {
  transform: scale(0.95);
}

/* サイドメニュー */
.side-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: min(450px, 90vw);
  height: 100vh;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
  z-index: 50;
  overflow-y: auto;
}

.menu-content {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.menu-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 1.5rem 0;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.selected-pairs {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1.5rem;
}

.pair-item {
  padding: 1.5rem;
  background: #f7fafc;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.pair-item__condition,
.pair-item__poem {
  margin-bottom: 0.75rem;
}

.pair-item__label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.pair-item__text {
  font-size: 0.95rem;
  color: #2d3748;
  margin: 0;
  line-height: 1.6;
}

.pair-item__arrow {
  font-size: 1.25rem;
  color: #a0aec0;
  font-weight: bold;
  text-align: center;
  margin: 0.5rem 0;
}

.menu-footer {
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

/* トランジション */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .poem-overlay {
    /* 左右の余白を少し増やして窮屈さを解消 */
    padding: 2rem 1.5rem;
  }

  .poem-title {
    font-size: clamp(1.25rem, 4vw, 1.8rem);
    margin-bottom: 1.0rem;
  }

  .poem-text {
    font-size: clamp(1.0rem, 3vw, 1.1rem); /* vw値を少し調整 */
    line-height: 1.7; /* 行間を少し詰めて情報量を確保 */

    word-break: auto;

    /*
     * line-break: strict; を緩和します。
     * これにより、より多くの場所で改行できるようになり、
     * テキストがコンテナからはみ出すのを防ぎます。
     */
    line-break: auto;
  }

  .menu-toggle {
    width: 50px;
    height: 50px;
    bottom: 1.5rem;
    right: 1.5rem;
    font-size: 1.25rem;
  }

  .print-button {
    width: 50px;
    height: 50px;
    bottom: 1.5rem;
    right: 4.5rem;
    font-size: 1.25rem;
  }

  .side-menu {
    width: 100vw;
  }

  .menu-content {
    padding: 1.5rem;
  }

  .menu-title {
    font-size: 1.25rem;
  }
}
</style>
