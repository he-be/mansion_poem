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
  max-width: 1300px; /* Width increased for 4 columns */
  height: 100%;
  min-height: 300px;
  margin: 2rem auto 0;
  padding: 0.5rem; /* Reduced padding */
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.grid-wrapper {
  column-count: 4; /* 4 Columns */
  column-gap: 1rem; /* Reduced gap */
  column-fill: auto;
  height: 100%;
  
  widows: 1;
  orphans: 1;
}

.grid-item {
  break-inside: avoid;
  margin-bottom: 0.5rem; /* Reduced margin */
  opacity: 0.9;
  font-size: 0.85rem; /* Slightly smaller but readable */
  color: #e0e0e0;
  line-height: 1.35;
  
  padding: 0.35rem 0.5rem; /* Compact padding */
  background: rgba(255, 255, 255, 0.03);
  border-radius: 2px;
}

.grid-item.header {
  color: #d4af37;
  font-weight: 700;
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  padding-bottom: 0.2rem;
  margin-top: 0.75rem;
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
    column-count: 2; /* 2 cols on tablet */
    column-gap: 1rem;
    overflow-y: auto; 
    height: auto;
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .grid-wrapper {
    column-count: 1; /* 1 col on mobile */
  }
  
  .streaming-grid-container {
    height: auto;
    background: transparent;
    border: none;
  }
}
</style>
