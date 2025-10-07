<template>
  <div class="start-view">
    <div class="start-content">
      <h1 class="start-title">マンションポエマー</h1>
      <p class="start-description">
        ままならない現実を、<br />
        詩的な言葉で言い換える。
      </p>
      <AppButton
        label="創造を開始する"
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.start-content {
  text-align: center;
  color: white;
}

.start-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: 0.05em;
}

.start-description {
  font-size: 1.25rem;
  line-height: 1.8;
  margin-bottom: 3rem;
  opacity: 0.9;
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
