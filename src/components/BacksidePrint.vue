<template>
  <div class="backside-print">
    <div class="backside-header">
      <h1 class="backside-title">選ばれた言葉の組み合わせ</h1>
      <p class="backside-subtitle">このポエムを生み出したあなたの選択</p>
    </div>

    <div class="combinations-list">
      <div
        v-for="(pair, index) in selectedPairs"
        :key="pair.conditionCard.id"
        class="combination-item"
      >
        <div class="combination-number">{{ index + 1 }}</div>
        <div class="combination-content">
          <div class="combination-row">
            <span class="combination-label">現実</span>
            <p class="combination-text">{{ pair.conditionCard.condition_text }}</p>
          </div>
          <div class="combination-arrow">↓</div>
          <div class="combination-row">
            <span class="combination-label">言い換え</span>
            <p class="combination-text">{{ pair.selectedPoem.poem_text }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="backside-footer">
      <div class="qr-section">
        <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="qr-code" />
        <p class="web-url">{{ webUrl }}</p>
        <p class="web-description">デジタル版で再度お楽しみください</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import type { SelectedPair } from '@/types/card'

interface Props {
  selectedPairs: SelectedPair[]
}

defineProps<Props>()

const webUrl = 'https://mansionpoem.masahiro-hibi.workers.dev'
const qrCodeUrl = ref<string>('')

onMounted(async () => {
  try {
    qrCodeUrl.value = await QRCode.toDataURL(webUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
  } catch (error) {
    console.error('QR code generation failed:', error)
  }
})
</script>

<style scoped>
.backside-print {
  display: none; /* 画面表示では非表示 */
}

.backside-header {
  text-align: center;
  margin-bottom: 15mm;
  border-bottom: 2px solid #000;
  padding-bottom: 8mm;
}

.backside-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 20pt;
  font-weight: 700;
  margin: 0 0 5mm 0;
  color: #000;
}

.backside-subtitle {
  font-size: 10pt;
  color: #333;
  margin: 0;
}

.combinations-list {
  margin-bottom: 10mm;
}

.combination-item {
  display: flex;
  gap: 5mm;
  margin-bottom: 8mm;
  padding: 5mm;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f9f9f9;
}

.combination-number {
  flex-shrink: 0;
  width: 8mm;
  height: 8mm;
  border-radius: 50%;
  background: #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 10pt;
}

.combination-content {
  flex: 1;
}

.combination-row {
  margin-bottom: 3mm;
}

.combination-row:last-child {
  margin-bottom: 0;
}

.combination-label {
  display: inline-block;
  font-size: 8pt;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 1mm;
  padding: 1mm 2mm;
  background: #e0e0e0;
  border-radius: 2px;
}

.combination-text {
  font-size: 11pt;
  line-height: 1.6;
  margin: 1mm 0 0 0;
  color: #000;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.combination-arrow {
  text-align: center;
  font-size: 12pt;
  color: #999;
  margin: 2mm 0;
}

.backside-footer {
  border-top: 2px solid #000;
  padding-top: 8mm;
}

.qr-section {
  text-align: center;
}

.qr-code {
  width: 40mm;
  height: 40mm;
  display: block;
  margin: 0 auto 5mm;
}

.web-url {
  font-size: 10pt;
  font-weight: 700;
  margin: 0 0 2mm 0;
  color: #000;
  word-break: break-all;
}

.web-description {
  font-size: 9pt;
  color: #666;
  margin: 0;
}

/* 印刷時のみ表示 */
@media print {
  .backside-print {
    display: block;
    width: 210mm;
    height: 297mm;
    padding: 20mm 25mm;
    box-sizing: border-box;
    background: white;
    color: #000;
    page-break-before: always;
    page-break-after: always;
    position: relative;
  }
}
</style>
