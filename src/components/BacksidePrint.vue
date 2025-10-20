<template>
  <div class="backside-print">
    <div class="backside-header">
      <h1 class="backside-title">選ばれた言葉の組み合わせ</h1>
    </div>

    <table class="combinations-table">
      <thead>
        <tr>
          <th class="col-number">No.</th>
          <th class="col-condition">現実</th>
          <th class="col-poem">言い換え</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(pair, index) in selectedPairs" :key="pair.conditionCard.id">
          <td class="col-number">{{ index + 1 }}</td>
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
  margin-bottom: 8mm;
  padding-bottom: 4mm;
  border-bottom: 2px solid #000;
}

.backside-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 18pt;
  font-weight: 700;
  margin: 0;
  color: #000;
}

.combinations-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8mm;
  font-family: 'Noto Serif JP', serif;
}

.combinations-table thead {
  background: #f0f0f0;
}

.combinations-table th {
  padding: 3mm 2mm;
  text-align: left;
  font-size: 10pt;
  font-weight: 700;
  border: 1px solid #000;
  color: #000;
}

.combinations-table td {
  padding: 3mm 2mm;
  font-size: 11pt;
  line-height: 1.5;
  border: 1px solid #666;
  color: #000;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.col-number {
  width: 12mm;
  text-align: center;
}

.col-condition {
  width: 45%;
}

.col-poem {
  width: 45%;
}

.backside-footer {
  border-top: 2px solid #000;
  padding-top: 6mm;
}

.qr-section {
  text-align: center;
}

.qr-code {
  width: 35mm;
  height: 35mm;
  display: block;
  margin: 0 auto 3mm;
}

.web-url {
  font-size: 10pt;
  font-weight: 700;
  margin: 0 0 1mm 0;
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
