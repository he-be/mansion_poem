<template>
  <div class="layout-a">
    <div class="background-image" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>
    <div class="poem-overlay">
      <h1 class="poem-title">{{ title }}</h1>
      <p class="poem-text">{{ poem }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LayoutProps } from '@/types/layout'

defineProps<LayoutProps>()

// コンポーネント名を明示的に定義（テストで検出できるように）
defineOptions({
  name: 'LayoutA',
})
</script>

<style scoped>
.layout-a {
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

.poem-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
  z-index: 2;
  text-align: center;
  box-sizing: border-box;
}

.poem-title {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 700;
  color: #d4af37; /* ゴールド */
  text-shadow:
    /* グラデーション影: 下方向 */
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 4px 8px rgba(0, 0, 0, 0.25),
    0 8px 16px rgba(0, 0, 0, 0.2),
    0 12px 24px rgba(0, 0, 0, 0.15),
    /* ゴールドの光彩効果 */
    0 0 20px rgba(212, 175, 55, 0.6),
    0 0 40px rgba(212, 175, 55, 0.3);
  margin: 0 0 2rem 0;
  letter-spacing: 0.1em;
  line-height: 1.4;
}

.poem-text {
  font-family: 'Noto Serif JP', 'Times New Roman', serif;
  font-size: clamp(1.125rem, 2.5vw, 1.75rem);
  font-weight: 500;
  color: #f5e6d3; /* クリーム色のゴールド */
  text-shadow:
    /* グラデーション影: 下方向 */
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.35),
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 6px 12px rgba(0, 0, 0, 0.25),
    0 8px 16px rgba(0, 0, 0, 0.2),
    /* 柔らかい光彩効果 */
    0 0 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(0, 0, 0, 0.3);
  line-height: 2;
  max-width: 900px;
  width: 100%; /* 親要素の幅に合わせる */
  box-sizing: border-box; /* paddingを含めた幅計算 */
  white-space: pre-wrap;
  word-break: keep-all;        /* 単語の途中で改行しない */
  line-break: strict;          /* 日本語の禁則処理を厳格に適用 */
  overflow-wrap: break-word;   /* 長すぎる単語のみ改行 */
  hanging-punctuation: force-end; /* 句読点を行末に配置 */
  letter-spacing: 0.05em;
  margin: 0;
}

@media (max-width: 768px) {
  .poem-overlay {
    padding: 2rem 1.5rem;
  }

  .poem-title {
    font-size: clamp(1.25rem, 4vw, 1.8rem);
    margin-bottom: 1.0rem;
  }

  .poem-text {
    font-size: clamp(1.0rem, 3vw, 1.1rem);
    line-height: 1.7;
    word-break: auto;
    line-break: auto;
  }
}
</style>
