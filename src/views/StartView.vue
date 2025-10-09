<template>
  <div class="start-view">
    <div class="start-content">
      <h1 class="start-title">マンションポエマー</h1>
      <p class="start-description">
        現実という名の素材を、<br />
        言葉という名の芸術へ。<br />
        <span class="start-subtitle">ここから始まる、あなただけの物語。</span>
      </p>
      <AppButton
        label="物語を紡ぐ"
        variant="primary"
        @click="handleStart"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const gameStore = useGameStore()

const handleStart = () => {
  gameStore.startGame()
  router.push('/game')
}
</script>

<style scoped>
.start-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.start-content {
  text-align: center;
  color: white;
}

.start-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 2rem;
  letter-spacing: 0.1em;
  color: #d4af37;
  text-shadow: 0 2px 12px rgba(212, 175, 55, 0.5);
}

.start-description {
  font-size: 1.35rem;
  line-height: 2.2;
  margin-bottom: 3rem;
  opacity: 0.95;
  letter-spacing: 0.05em;
}

.start-subtitle {
  display: block;
  margin-top: 1.5rem;
  font-size: 1.1rem;
  font-style: italic;
  opacity: 0.8;
  letter-spacing: 0.03em;
}

@media (max-width: 768px) {
  .start-title {
    font-size: 2rem;
  }

  .start-description {
    font-size: 1rem;
  }
}
</style>
