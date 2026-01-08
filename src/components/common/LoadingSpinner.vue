<template>
  <div class="loading-spinner">
    <div class="spinner"></div>
    <p v-if="message" class="loading-message">{{ message }}</p>
    <div v-if="streamingText" class="streaming-text-container">
      <p class="streaming-text">{{ streamingText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string
  streamingText?: string
}>()
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  width: 100%;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(212, 175, 55, 0.3);
  border-top: 4px solid #d4af37;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-message {
  font-size: 1.1rem;
  color: #f5e6d3;
  text-align: center;
  margin-bottom: 1.5rem;
  letter-spacing: 0.1em;
}

.streaming-text-container {
  width: 100%;
  max-width: 600px;
  height: 150px;
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(212, 175, 55, 0.2);
}

.streaming-text {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85rem;
  color: #a0a0b0;
  line-height: 1.4;
  white-space: pre-wrap;
  margin: 0;
  /* 下からスクロールして出てくる感じにしたいが、まずは単純表示 */
  /* 文字数が増えると自動スクロールさせたいが、overflow:hiddenで最新が見えるようにする？
     あるいは逆に下揃えにする */
  display: flex;
  flex-direction: column-reverse;
  height: 100%;
  overflow-y: hidden;
}

/* フェードアウト効果 */
.streaming-text-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, rgba(22, 33, 62, 0.8), transparent);
  pointer-events: none;
}
</style>
