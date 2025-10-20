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
  margin-bottom: 10mm;
  padding-bottom: 5mm;
  border-bottom: 0.5pt solid #c9a961;
}

.backside-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 16pt;
  font-weight: 500;
  letter-spacing: 0.15em;
  margin: 0;
  color: #2c2c2c;
}

.combinations-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10mm;
  font-family: 'Noto Serif JP', serif;
}

.combinations-table thead {
  background: transparent;
  border-bottom: 1pt solid #d4af37;
}

.combinations-table th {
  padding: 4mm 4mm;
  text-align: left;
  font-size: 9pt;
  font-weight: 600;
  letter-spacing: 0.1em;
  border: none;
  border-bottom: 1pt solid #d4af37;
  color: #5a5a5a;
  text-transform: uppercase;
}

.combinations-table td {
  padding: 5mm 4mm;
  font-size: 11pt;
  line-height: 1.7;
  border: none;
  border-bottom: 0.25pt solid #e5e5e5;
  color: #2c2c2c;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.combinations-table tbody tr:last-child td {
  border-bottom: none;
}

.col-condition {
  width: 50%;
}

.col-poem {
  width: 50%;
}

.backside-footer {
  border-top: 0.5pt solid #c9a961;
  padding-top: 8mm;
}

.qr-section {
  text-align: center;
}

.qr-code {
  width: 35mm;
  height: 35mm;
  display: block;
  margin: 0 auto 4mm;
  border: 1pt solid #e5e5e5;
  padding: 2mm;
}

.web-url {
  font-size: 9pt;
  font-weight: 500;
  letter-spacing: 0.05em;
  margin: 0 0 2mm 0;
  color: #5a5a5a;
  word-break: break-all;
}

.web-description {
  font-size: 8pt;
  font-weight: 400;
  letter-spacing: 0.05em;
  color: #8a8a8a;
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
