<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';
import { computed } from 'vue';

const gameStore = useGameStore();

// 最新の思考を下に表示するために逆順にするか、あるいはCSSで制御するか
// TransitionGroupを使うので、新しい要素を配列の最後に追加し、下から湧き上がるように見せる
const thoughts = computed(() => gameStore.streamingThoughts);

</script>

<template>
  <div class="streaming-bubbles-container">
    <TransitionGroup name="bubble-list" tag="div" class="bubbles-wrapper">
      <div
        v-for="thought in thoughts"
        :key="thought.id"
        class="bubble"
        :class="thought.type"
      >
        <span class="bubble-icon" v-if="thought.type === 'header'">💡</span>
        <span class="bubble-icon" v-else-if="thought.type === 'item'">✨</span>
        <span class="bubble-text">{{ thought.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.streaming-bubbles-container {
  position: absolute;
  bottom: 120px; /* ボタンの上あたり */
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  height: 400px; /* 表示領域の高さ */
  pointer-events: none; /* 下の要素をクリックできるように */
  overflow: hidden; /* 領域外は非表示 */
  display: flex;
  flex-direction: column-reverse; /* 下から上へ積み上げ */
  z-index: 20;
}

.bubbles-wrapper {
  display: flex;
  flex-direction: column; /* 新しいものが下に追加される（column-reverseなcontainer内なので上に行く？） 
     いや、TransitionGroupは要素の順序通りに出す。
     thoughtsはpushされていくので、[old, ..., new]。
     下から新しいものを出したいなら、flex-direction: column; で下にnewが来る。
     それを containerの justify-content: flex-end ではないか？
  */
  justify-content: flex-end;
  gap: 12px;
  padding-bottom: 20px;
}

.bubble {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 12px 16px;
  border-radius: 20px;
  border-bottom-left-radius: 4px; /* 吹き出しっぽく */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
  display: inline-flex;
  align-items: flex-start;
  max-width: 80%;
  align-self: flex-start; /* 左寄せ */
  margin-left: 10%; /* 少し中央寄り */
  
  /* アニメーション用初期状態 */
  transform-origin: bottom left;
}

.bubble.header {
  background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
  border-left: 4px solid #4a90e2;
  font-weight: 700;
  color: #2c3e50;
}

.bubble.item {
  background: #fff;
  border-left: 4px solid #f5a623;
  font-size: 0.9rem;
}

.bubble-icon {
  margin-right: 8px;
  font-size: 1.1rem;
}

/* Vue Transition Animation */
.bubble-list-enter-active,
.bubble-list-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bubble-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.bubble-list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Ensure items move smoothly when others disappear */
.bubble-list-move {
  transition: transform 0.5s ease;
}
</style>
