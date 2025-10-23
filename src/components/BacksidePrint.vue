<template>
  <div class="backside-print">
    <div class="backside-header">
      <h1 class="backside-title">選ばれた言葉の組み合わせ</h1>
    </div>

    <table class="combinations-table">
      <thead>
        <tr>
          <th class="col-condition">現実</th>
          <th class="col-poem">言い換え</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pair in selectedPairs" :key="pair.conditionCard.id">
          <td class="col-condition">{{ pair.conditionCard.condition_text }}</td>
          <td class="col-poem">{{ pair.selectedPoem.poem_text }}</td>
        </tr>
      </tbody>
    </table>

    <div class="backside-footer">
      <div class="qr-section">
        <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="qr-code" />
        <p class="web-url">{{ webUrl }}</p>
        <p class="web-description">デジタル版はこちら</p>
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
  margin-bottom: 12mm;
}

.backside-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 18pt;
  font-weight: 400;
  letter-spacing: 0.2em;
  margin: 0;
  color: #000;
}

.combinations-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12mm;
  font-family: 'Noto Serif JP', serif;
}

.combinations-table thead {
  background: transparent;
}

.combinations-table th {
  padding: 5mm 5mm 6mm;
  text-align: center;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.15em;
  border: none;
  color: #000;
  text-transform: uppercase;
}

.combinations-table td {
  padding: 6mm 5mm;
  font-size: 11pt;
  line-height: 1.8;
  border: none;
  color: #000;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.col-condition {
  width: 50%;
}

.col-poem {
  width: 50%;
  font-style: italic;
}

.backside-footer {
  padding-top: 10mm;
}

.qr-section {
  text-align: center;
}

.qr-code {
  width: 35mm;
  height: 35mm;
  display: block;
  margin: 0 auto 5mm;
  border: 0.5pt solid #000;
  padding: 2mm;
}

.web-url {
  font-size: 9pt;
  font-weight: 500;
  letter-spacing: 0.08em;
  margin: 0 0 3mm 0;
  color: #000;
  word-break: break-all;
}

.web-description {
  font-size: 8pt;
  font-weight: 400;
  letter-spacing: 0.12em;
  color: #000;
  margin: 0;
  text-transform: uppercase;
}

/* 印刷時のみ表示 */
@media print {
  .backside-print {
    display: block;
    width: 210mm;
    height: 297mm;
    padding: 15mm 20mm;
    box-sizing: border-box;
    background: white;
    color: #000;
    page-break-before: always;
    page-break-after: avoid;
    position: relative;
    overflow: hidden;
  }

  /* A4サイズ計算:
   * padding上: 15mm
   * header: 12mm (title + border + margin)
   * table: 約130mm (5行 × 26mm/行)
   * footer: 50mm (QR 35mm + text + margins)
   * padding下: 15mm
   * 合計: 222mm < 297mm ✓
   */
}
</style>
