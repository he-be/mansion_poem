<template>
  <div class="layout-c">
    <div class="background-image" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>
    <div class="scroll-container" @scroll="handleScroll">
      <div class="spacer"></div>

      <div class="text-section" :class="{ visible: titleVisible }">
        <h1 class="animated-title">{{ title }}</h1>
      </div>

      <div class="poem-lines">
        <div
          v-for="(line, index) in poemLines"
          :key="index"
          class="poem-line"
          :class="{ visible: lineVisibility[index] }"
        >
          {{ line }}
        </div>
      </div>

      <div class="spacer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { LayoutProps } from '@/types/layout'

const props = defineProps<LayoutProps>()

defineOptions({
  name: 'LayoutC',
})

const titleVisible = ref(false)
const lineVisibility = ref<boolean[]>([])

// ポエムを行ごとに分割
const poemLines = computed(() => {
  return props.poem.split('\n').filter((line) => line.trim() !== '')
})

onMounted(() => {
  // 初期状態ですべて非表示
  lineVisibility.value = new Array(poemLines.value.length).fill(false)

  // タイトルは最初から表示
  setTimeout(() => {
    titleVisible.value = true
  }, 300)
})

const handleScroll = (event: Event) => {
  const container = event.target as HTMLElement
  const scrollTop = container.scrollTop
  const windowHeight = container.clientHeight

  // スクロール位置に応じて行を表示
  const poemLinesElements = container.querySelectorAll('.poem-line')
  poemLinesElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const relativeTop = rect.top - containerRect.top + scrollTop

    // 要素が画面の70%の位置に来たら表示
    if (relativeTop < scrollTop + windowHeight * 0.7) {
      lineVisibility.value[index] = true
    }
  })
}
</script>

<style scoped>
.layout-c {
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

.scroll-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 2;
  scroll-behavior: smooth;
}

.spacer {
  height: 100vh;
}

.text-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  opacity: 0;
  transform: translateY(50px);
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.text-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.animated-title {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 800;
  color: #d4af37;
  text-shadow:
    0 4px 12px rgba(0, 0, 0, 0.8),
    0 8px 24px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(212, 175, 55, 0.5);
  letter-spacing: 0.15em;
  line-height: 1.3;
  text-align: center;
  max-width: 90%;
}

.poem-lines {
  padding: 4rem 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.poem-line {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 500;
  color: #f5e6d3;
  text-shadow:
    0 2px 8px rgba(0, 0, 0, 0.8),
    0 4px 16px rgba(0, 0, 0, 0.6),
    0 0 20px rgba(0, 0, 0, 0.4);
  line-height: 2.2;
  margin-bottom: 3rem;
  padding: 1.5rem;
  border-left: 4px solid rgba(212, 175, 55, 0.5);
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    rgba(0, 0, 0, 0) 100%
  );
  backdrop-filter: blur(4px);

  opacity: 0;
  transform: translateX(-100px) scale(0.95);
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.poem-line.visible {
  opacity: 1;
  transform: translateX(0) scale(1);
}

@media (max-width: 768px) {
  .animated-title {
    font-size: clamp(1.8rem, 8vw, 3rem);
    letter-spacing: 0.1em;
  }

  .poem-lines {
    padding: 2rem 1rem;
  }

  .poem-line {
    font-size: clamp(1.1rem, 4vw, 1.5rem);
    line-height: 1.9;
    margin-bottom: 2rem;
    padding: 1rem;
  }
}

/* 印刷用スタイル */
@media print {
  .layout-c {
    position: relative;
    width: 210mm;
    height: 297mm;
  }

  .background-image {
    display: none !important;
  }

  .scroll-container {
    position: relative;
    width: 210mm;
    height: auto;
    overflow: visible;
    scroll-behavior: auto;
  }

  .spacer {
    display: none !important;
  }

  .text-section {
    min-height: auto;
    padding: 20mm 25mm 10mm;
    opacity: 1 !important;
    transform: none !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .animated-title {
    font-size: 24pt;
    color: #000000;
    text-shadow: none;
    margin: 0;
    text-align: center;
    word-break: keep-all;
    overflow-wrap: break-word;
    line-break: strict;
  }

  .poem-lines {
    padding: 10mm 25mm 20mm;
    max-width: none;
    margin: 0 auto;
  }

  .poem-line {
    font-size: 12pt;
    color: #000000;
    text-shadow: none;
    line-height: 2;
    margin-bottom: 8mm;
    padding: 0;
    border-left: none;
    background: none;
    backdrop-filter: none;
    opacity: 1 !important;
    transform: none !important;
    text-align: left;
  }
}
</style>
