<template>
  <div class="start-view">
    <div class="start-content">
      <h1 class="start-title">マンションポエマー</h1>
      <p class="start-description">
        どんな立地のマンションでも、<br />
        素敵な広告が作れるはずです。<br />
        <span class="start-subtitle">あなたもマンションポエムを作ってみましょう。</span>
      </p>
      
      <button class="text-button" @click="handleStart">
        マンションを見にいく
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'

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
  max-width: 800px;
}

.start-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
  letter-spacing: 0.1em;
  color: #d4af37;
  text-shadow: 0 2px 12px rgba(212, 175, 55, 0.5);
}

.start-description {
  font-size: 1.5rem;
  line-height: 2;
  margin-bottom: 3.5rem;
  color: #f0f0f0;
  letter-spacing: 0.05em;
}

.start-subtitle {
  display: block;
  margin-top: 1rem;
  font-size: 1.2rem;
  color: #a0aec0;
}

@media (max-width: 768px) {
  .start-title {
    font-size: 2rem;
  }

  .start-description {
    font-size: 1.1rem;
  }
}
</style>
