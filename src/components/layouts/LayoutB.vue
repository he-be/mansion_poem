<template>
  <div class="layout-b">
    <div class="background-image" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>
    <div class="featured-sentence">
      {{ featuredSentence }}
    </div>
    <div class="content-panel">
      <h2 class="small-title">{{ title }}</h2>
      <p class="remaining-text">{{ remainingText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutProps } from '@/types/layout'

const props = defineProps<LayoutProps>()

defineOptions({
  name: 'LayoutB',
})

// ポエムから最初の1センテンスを抽出
const featuredSentence = computed(() => {
  const sentences = props.poem.split(/[。！？\n]/)
  return sentences[0] + '。'
})

// 残りのテキスト
const remainingText = computed(() => {
  const sentences = props.poem.split(/([。！？])/)
  if (sentences.length <= 2) return ''
  return sentences.slice(2).join('')
})
</script>

<style scoped>
.layout-b {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 1;
}

.featured-sentence {
  position: absolute;
  top: 10%;
  right: 5%;
  max-width: 45%;
  z-index: 2;
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 800;
  color: #ffffff;
  text-shadow:
    0 4px 8px rgba(0, 0, 0, 0.6),
    0 8px 16px rgba(0, 0, 0, 0.4),
    0 0 30px rgba(255, 255, 255, 0.3);
  line-height: 1.3;
  letter-spacing: 0.08em;
}

.content-panel {
  position: absolute;
  bottom: 8%;
  left: 5%;
  max-width: 40%;
  z-index: 2;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.small-title {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(1.2rem, 2.5vw, 2rem);
  font-weight: 600;
  color: #d4af37;
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.remaining-text {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(0.95rem, 1.8vw, 1.3rem);
  font-weight: 400;
  color: #f5e6d3;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 0;
}

@media (max-width: 768px) {
  .featured-sentence {
    top: 15%;
    right: 5%;
    max-width: 90%;
    font-size: clamp(1.8rem, 8vw, 3rem);
  }

  .content-panel {
    bottom: 5%;
    left: 5%;
    max-width: 90%;
    padding: 1.5rem;
  }

  .small-title {
    font-size: clamp(1rem, 4vw, 1.5rem);
  }

  .remaining-text {
    font-size: clamp(0.85rem, 3vw, 1rem);
  }
}
</style>
