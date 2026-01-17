
import { defineStore } from 'pinia'
import type { GameState, ConditionCard, SelectedPair } from '@/types/card'
import cardsData from '@/data/cards.json'
import { selectRandomCards } from '@/utils/cardSelector'
import { generateTitle } from '@/utils/titleGenerator'
import { generatePoemWithGemini } from '@/utils/geminiClient'
import { selectRandomBackground } from '@/utils/backgroundSelector'
import { StreamingParser } from '@/utils/streamingParser'

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    currentPhase: 'start',
    dealtCards: [],
    selectedPairs: {},
    generatedTitle: '',
    generatedPoem: '',
    selectedBackground: '',
    isGeneratingPoem: false,
    poemGenerationError: null,
    streamingText: '',
    streamingThoughts: [],
  }),

  getters: {
    /**
     * 5枚すべてのカードが選択されているかチェック
     */
    isAllSelected: (state): boolean => {
      const targetCount = import.meta.env.VITE_MAKER_FAIRE_MODE === 'true' ? 3 : 5
      return Object.keys(state.selectedPairs).length === targetCount
    },

    /**
     * 選択されたペアを配列形式で取得
     */
    selectedPairsArray: (state): SelectedPair[] => {
      return Object.values(state.selectedPairs)
    },
  },

  actions: {
    /**
     * ゲームを開始し、5枚のカードをランダムに配る
     */
    startGame() {
      const cardCount = import.meta.env.VITE_MAKER_FAIRE_MODE === 'true' ? 3 : 5
      this.dealtCards = selectRandomCards(cardsData as ConditionCard[], cardCount)
      this.selectedPairs = {}
      this.generatedTitle = ''
      this.generatedPoem = ''
      this.selectedBackground = ''
      this.isGeneratingPoem = false
      this.poemGenerationError = null
      this.streamingText = ''
      this.streamingThoughts = []
      this.currentPhase = 'game'
    },

    /**
     * 条件カードに対してポエムを選択
     * @param conditionCardId 条件カードのID
     * @param poemId 選択したポエムのID
     */
    selectPoem(conditionCardId: string, poemId: string) {
      const card = this.dealtCards.find((c) => c.id === conditionCardId)
      const poem = card?.poems.find((p) => p.id === poemId)

      if (card && poem) {
        this.selectedPairs[conditionCardId] = {
          conditionCard: card,
          selectedPoem: poem,
        }
      }
    },

    /**
     * チラシを生成し、結果画面へ遷移
     * LLMによるポエム生成を含む
     */
    async generateFlyer() {
      this.selectedBackground = selectRandomBackground()

      // LLMによるポエムとタイトル生成
      this.isGeneratingPoem = true
      this.poemGenerationError = null
      this.streamingText = ''
      this.streamingThoughts = []
      const parser = new StreamingParser();

      try {
        const result = await generatePoemWithGemini({
          selectedPairs: this.selectedPairsArray,
          onProgress: (text: string, _isReasoning: boolean) => {
            // ストリーミング内容を状態に反映
            // 推論プロセスと生成本文を区別して表示したい場合はここで分岐可能
            // 現状は全て流れるように表示する
            this.streamingText += text

            // パーサーで思考バブルを生成
            // 推論中(isReasoning=true)またはテキストが解析可能な場合
            const newThoughts = parser.append(text);
            if (newThoughts.length > 0) {
              this.streamingThoughts.push(...newThoughts);
            }
          }
        })
        this.generatedTitle = result.title
        this.generatedPoem = result.poem
        this.currentPhase = 'result'
      } catch (error) {
        this.poemGenerationError = error instanceof Error
          ? error.message
          : 'ポエムの生成に失敗しました'
        // エラー時はデフォルトメッセージとフォールバックタイトルを使用
        this.generatedTitle = generateTitle(this.selectedPairsArray)
        this.generatedPoem = 'あなたの選んだ言葉が、新しい物語を紡ぎます。'
        this.currentPhase = 'result'
      } finally {
        this.isGeneratingPoem = false
        this.streamingText = ''
      }
    },

    /**
     * ポエム生成をリトライ
     */
    async retryPoemGeneration() {
      this.isGeneratingPoem = true
      this.poemGenerationError = null

      this.streamingText = ''
      this.streamingThoughts = []
      const parser = new StreamingParser();

      try {
        const result = await generatePoemWithGemini({
          selectedPairs: this.selectedPairsArray,
          onProgress: (text: string, _isReasoning: boolean) => {
            this.streamingText += text

            const newThoughts = parser.append(text);
            if (newThoughts.length > 0) {
              this.streamingThoughts.push(...newThoughts);
            }
          }
        })
        this.generatedTitle = result.title
        this.generatedPoem = result.poem
      } catch (error) {
        this.poemGenerationError = error instanceof Error
          ? error.message
          : 'ポエムの生成に失敗しました'
        this.generatedTitle = generateTitle(this.selectedPairsArray)
        this.generatedPoem = 'あなたの選んだ言葉が、新しい物語を紡ぎます。'
      } finally {
        this.isGeneratingPoem = false
      }
    },

    /**
     * ゲームをリセットし、開始画面に戻る
     */
    reset() {
      this.currentPhase = 'start'
      this.dealtCards = []
      this.selectedPairs = {}
      this.generatedTitle = ''
      this.generatedPoem = ''
      this.selectedBackground = ''
      this.isGeneratingPoem = false
      this.poemGenerationError = null
      this.streamingText = ''
    },
  },
})
