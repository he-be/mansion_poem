<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';
import { computed } from 'vue';

const gameStore = useGameStore();
const thoughts = computed(() => gameStore.streamingThoughts);

</script>

<template>
  <div class="streaming-grid-container">
    <TransitionGroup name="grid-item" tag="div" class="grid-wrapper">
      <div
        v-for="thought in thoughts"
        :key="thought.id"
        class="grid-item"
        :class="thought.type"
      >
        <div class="item-content">
          <span class="item-icon" v-if="thought.type === 'header'">◈</span>
          <span class="item-icon" v-else-if="thought.type === 'item'">-</span>
          <span class="item-text">{{ thought.text }}</span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.streaming-grid-container {
  width: 100%;
  max-width: 1200px; /* Wide container */
  height: 300px;     /* Fixed height for column filling */
  margin: 2rem auto 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.grid-wrapper {
  column-count: 3; /* 3 Columns */
  column-gap: 2rem;
  column-fill: auto; /* Fill first column then move to next */
  height: 100%;
  
  /* For Firefox/Chrome column break handling */
  widows: 1;
  orphans: 1;
}

.grid-item {
  break-inside: avoid; /* Prevent splitting across columns */
  margin-bottom: 0.8rem;
  opacity: 0.9;
  font-size: 0.9rem;
  color: #e0e0e0;
  line-height: 1.4;
  
  /* Premium card styling for items? Maybe too heavy. Keep it simple text. */
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 2px;
}

.grid-item.header {
  color: #d4af37;
  font-weight: 700;
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  padding-bottom: 0.25rem;
  margin-top: 1rem;
}

.grid-item.header:first-child {
  margin-top: 0;
}

.item-icon {
  display: inline-block;
  width: 1.2em;
  color: #d4af37;
  opacity: 0.7;
}

/* Transitions */
.grid-item-enter-active,
.grid-item-leave-active {
  transition: all 0.3s ease;
}

.grid-item-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .grid-wrapper {
    column-count: 1;
    overflow-y: auto; 
    height: auto;
    max-height: 300px;
  }
  
  .streaming-grid-container {
    height: auto;
    background: transparent;
    border: none;
  }
}
</style>
