<template>
  <div class="result-view">
    <div class="flyer">
      <header class="flyer-header">
        <h1 class="flyer-title">{{ gameStore.generatedTitle }}</h1>
      </header>

      <div class="flyer-content">
        <div
          v-for="pair in gameStore.selectedPairsArray"
          :key="pair.conditionCard.id"
          class="flyer-pair"
        >
          <div class="flyer-pair__condition">
            <span class="flyer-pair__label">現実</span>
            <p class="flyer-pair__text">{{ pair.conditionCard.condition_text }}</p>
          </div>
          <div class="flyer-pair__arrow">→</div>
          <div class="flyer-pair__poem">
            <span class="flyer-pair__label">言い換え</span>
            <p class="flyer-pair__text">{{ pair.selectedPoem.poem_text }}</p>
          </div>
        </div>
      </div>

      <footer class="flyer-footer">
        <p class="flyer-closing">世界は、あなたの言葉で完成する。</p>
        <AppButton
          label="もう一度創造する"
          variant="secondary"
          @click="handleRestart"
        />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const gameStore = useGameStore()

const handleRestart = () => {
  gameStore.reset()
  router.push('/')
}
</script>

<style scoped>
.result-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flyer {
  max-width: 800px;
  width: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.flyer-header {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
}

.flyer-title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.6;
  margin: 0;
}

.flyer-content {
  padding: 2rem;
}

.flyer-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.flyer-pair:last-child {
  border-bottom: none;
}

.flyer-pair__condition,
.flyer-pair__poem {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.flyer-pair__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
}

.flyer-pair__text {
  font-size: 1rem;
  color: #2d3748;
  margin: 0;
  line-height: 1.6;
}

.flyer-pair__arrow {
  font-size: 1.5rem;
  color: #a0aec0;
  font-weight: bold;
}

.flyer-footer {
  padding: 2rem;
  text-align: center;
  background-color: #f7fafc;
  border-top: 1px solid #e2e8f0;
}

.flyer-closing {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 2rem 0;
  font-style: italic;
}

@media (max-width: 768px) {
  .result-view {
    padding: 1rem;
  }

  .flyer-header {
    padding: 2rem 1rem;
  }

  .flyer-title {
    font-size: 1.5rem;
  }

  .flyer-content {
    padding: 1rem;
  }

  .flyer-pair {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  .flyer-pair__arrow {
    text-align: center;
    transform: rotate(90deg);
  }

  .flyer-footer {
    padding: 1.5rem 1rem;
  }

  .flyer-closing {
    font-size: 1rem;
  }
}
</style>
