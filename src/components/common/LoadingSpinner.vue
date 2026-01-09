<template>
  <div class="loading-spinner">
    <div class="spinner"></div>
    <p v-if="message" class="loading-message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string
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
  margin-bottom: 0;
  letter-spacing: 0.1em;
}
</style>
