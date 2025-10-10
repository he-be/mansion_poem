<template>
  <div class="dev-preview">
    <div class="dev-preview__header">
      <h1>🎨 レイアウトプレビュー</h1>
      <p class="dev-preview__description">
        開発用: 様々なレイアウトパターンを確認できます
      </p>
    </div>

    <div class="dev-preview__controls">
      <button
        v-for="(_sample, index) in samples"
        :key="index"
        :class="['sample-button', { active: currentSampleIndex === index }]"
        @click="selectSample(index)"
      >
        サンプル {{ index + 1 }}
      </button>
      <button class="sample-button sample-button--random" @click="selectRandomSample">
        🎲 ランダム
      </button>
    </div>

    <div class="dev-preview__info">
      <p><strong>タイトル:</strong> {{ currentSample.generatedTitle }}</p>
      <p><strong>選択カード数:</strong> {{ currentSample.selectedPairs.length }}</p>
    </div>

    <!-- ResultViewを埋め込み表示 -->
    <div v-if="isReady" class="dev-preview__content">
      <ResultView />
    </div>
    <div v-else class="dev-preview__loading">
      <p>準備中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { createMockGameState, createMockSelectedPair, createMockConditionCard, createMockPoem } from '@/test-utils/mockFactories'
import ResultView from './ResultView.vue'

const gameStore = useGameStore()
const currentSampleIndex = ref(0)
const isReady = ref(false)

// 複数のサンプルデータを用意
const samples = [
  // サンプル1: デフォルト
  createMockGameState(),

  // サンプル2: 短いポエム
  {
    selectedPairs: [
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c1', category: '周辺環境', condition_text: '駅遠' }),
        selectedPoem: createMockPoem({ id: 'p1', poem_text: '静寂。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c2', category: '交通アクセス', condition_text: 'バス便' }),
        selectedPoem: createMockPoem({ id: 'p2', poem_text: '自然との対話。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c3', category: '室内・仕様', condition_text: '狭小' }),
        selectedPoem: createMockPoem({ id: 'p3', poem_text: 'ミニマル。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c4', category: '眺望・日照', condition_text: '1階' }),
        selectedPoem: createMockPoem({ id: 'p4', poem_text: '地に足。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c5', category: '立地・アドレス', condition_text: '郊外' }),
        selectedPoem: createMockPoem({ id: 'p5', poem_text: '開放。' }),
      }),
    ],
    generatedTitle: '静寂。',
    generatedPoem: `短い。\n\nシンプル。\n\n美しい。`,
  },

  // サンプル3: 長いポエム
  {
    selectedPairs: [
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c1', category: '周辺環境' }),
        selectedPoem: createMockPoem({ poem_text: 'これは非常に長いポエムのテキストで、複数行にわたって表示される可能性があります。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c2', category: '交通アクセス' }),
        selectedPoem: createMockPoem({ poem_text: '交通の便が悪いということは、都会の喧騒から離れた静寂な環境を意味します。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c3', category: '室内・仕様' }),
        selectedPoem: createMockPoem({ poem_text: '限られた空間こそが、本当に必要なものを見極める力を与えてくれる。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c4', category: '眺望・日照' }),
        selectedPoem: createMockPoem({ poem_text: '北向きの柔らかな光は、一日中安定した明るさで創造的な活動をサポートします。' }),
      }),
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: 'c5', category: '立地・アドレス' }),
        selectedPoem: createMockPoem({ poem_text: '繁華街の近くに住むということは、都市の鼓動を感じながら生きるということ。' }),
      }),
    ],
    generatedTitle: 'これは非常に長いポエムのテキストで、複数行にわたって表示される可能性があります。',
    generatedPoem: `都会の中心に位置しながらも、静寂に包まれた特別な場所。
ここでは時間がゆっくりと流れ、日々の喧騒から解放される。

限られた空間は、本当に大切なものを見極める力を与えてくれる。
北向きの柔らかな光が、一日中穏やかに室内を満たし、
創造的な活動をサポートする理想的な環境を作り出す。

駅から続く道のりは、都市と自然を繋ぐ回廊。
毎日の通勤が、心を整える儀式へと変わる。
これは、選ばれた者だけが知る、新しい暮らしの物語。

繁華街の活気を感じながらも、自分だけの静かな時間を持つ。
それは、現代を生きる私たちにとって、最も贅沢な時間の使い方かもしれない。`,
  },

  // サンプル4: タイトルが特殊
  {
    selectedPairs: Array.from({ length: 5 }, (_, i) =>
      createMockSelectedPair({
        conditionCard: createMockConditionCard({ id: `c${i}`, category: `カテゴリ${i}` }),
        selectedPoem: createMockPoem({ id: `p${i}`, poem_text: `ポエム${i}` }),
      })
    ),
    generatedTitle: '非常に非常に非常に非常に非常に非常に非常に長いタイトルの場合の表示テスト',
    generatedPoem: '通常のポエム本文。\n\n改行あり。',
  },
]

const currentSample = computed(() => samples[currentSampleIndex.value])

async function selectSample(index: number) {
  currentSampleIndex.value = index
  await applySample()
}

async function selectRandomSample() {
  currentSampleIndex.value = Math.floor(Math.random() * samples.length)
  await applySample()
}

async function applySample() {
  const sample = currentSample.value

  // 一旦非表示にする
  isReady.value = false

  // ストアの状態を更新
  gameStore.selectedPairs = {}
  sample.selectedPairs.forEach((pair) => {
    gameStore.selectedPairs[pair.conditionCard.id] = pair
  })

  gameStore.generatedTitle = sample.generatedTitle
  gameStore.generatedPoem = sample.generatedPoem
  gameStore.currentPhase = 'result'

  // 次のティックで表示
  await nextTick()
  isReady.value = true
}

onMounted(async () => {
  await applySample()
})
</script>

<style scoped>
.dev-preview {
  min-height: 100vh;
  background-color: #f7fafc;
}

.dev-preview__header {
  position: relative;
  z-index: 100;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.dev-preview__header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.dev-preview__description {
  margin: 0;
  opacity: 0.9;
}

.dev-preview__controls {
  position: relative;
  z-index: 100;
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  justify-content: center;
}

.sample-button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #cbd5e0;
  border-radius: 8px;
  background: white;
  color: #2d3748;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.sample-button:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.sample-button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.sample-button--random {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
}

.sample-button--random:hover {
  transform: translateY(-2px) scale(1.05);
}

.dev-preview__info {
  position: relative;
  z-index: 100;
  padding: 1rem 1.5rem;
  background: #edf2f7;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.dev-preview__info p {
  margin: 0.25rem 0;
}

.dev-preview__content {
  /* ResultViewが全画面表示されるように */
  position: relative;
  min-height: calc(100vh - 300px);
}

.dev-preview__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 300px);
  font-size: 1.2rem;
  color: #718096;
}
</style>
