<template>
  <div class="result-view">
    <!-- 背景画像 -->
    <div class="background-image"></div>

    <!-- 生成されたポエムテキスト -->
    <div class="poem-overlay">
      <h1 class="poem-title">{{ gameStore.generatedTitle }}</h1>
      <p class="poem-text">{{ gameStore.generatedPoem }}</p>
      <div v-if="gameStore.poemGenerationError" class="error-overlay">
        <p>{{ gameStore.poemGenerationError }}</p>
        <AppButton
          label="再生成する"
          variant="secondary"
          @click="handleRetry"
        />
      </div>
    </div>

    <!-- 右下のメニュートグルボタン -->
    <button class="menu-toggle" @click="isMenuOpen = !isMenuOpen" aria-label="メニュー">
      <span v-if="!isMenuOpen">☰</span>
      <span v-else>✕</span>
    </button>

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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const gameStore = useGameStore()
const isMenuOpen = ref(false)

const handleRestart = () => {
  gameStore.reset()
  router.push('/')
}

const handleRetry = async () => {
  await gameStore.retryPoemGeneration()
}
</script>

<style scoped>
.result-view {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 背景画像 */
.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/img/bg_1.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

/* ポエムテキストオーバーレイ */
.poem-overlay {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.poem-title {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 700;
  color: #d4af37; /* ゴールド */
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.7),
               0 0 20px rgba(212, 175, 55, 0.5);
  margin: 0 0 2rem 0;
  letter-spacing: 0.1em;
  line-height: 1.4;
}

.poem-text {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(1.125rem, 2.5vw, 1.75rem);
  font-weight: 500;
  color: #f5e6d3; /* クリーム色のゴールド */
  text-shadow: 1px 1px 6px rgba(0, 0, 0, 0.8),
               0 0 15px rgba(0, 0, 0, 0.6);
  line-height: 2;
  max-width: 900px;
  white-space: pre-wrap;
  word-break: keep-all;        /* 単語の途中で改行しない */
  line-break: strict;          /* 日本語の禁則処理を厳格に適用 */
  overflow-wrap: break-word;   /* 長すぎる単語のみ改行 */
  hanging-punctuation: force-end; /* 句読点を行末に配置 */
  letter-spacing: 0.05em;
  margin: 0;
}

.error-overlay {
  margin-top: 2rem;
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
    padding: 2rem 1rem;
  }

  .poem-title {
    font-size: clamp(1.5rem, 6vw, 2.5rem);
    margin-bottom: 1.5rem;
  }

  .poem-text {
    font-size: clamp(1rem, 3vw, 1.25rem);
  }

  .menu-toggle {
    width: 50px;
    height: 50px;
    bottom: 1.5rem;
    right: 1.5rem;
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

/* Google Fontsのインポート（Noto Serif JP） */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500;700&display=swap');
</style>
