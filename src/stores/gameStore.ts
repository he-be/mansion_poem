import { defineStore } from 'pinia'
import type { GameState, ConditionCard, SelectedPair } from '@/types/card'
import cardsData from '@/data/cards.json'
import { selectRandomCards } from '@/utils/cardSelector'
import { generateTitle } from '@/utils/titleGenerator'
import { generatePoemWithGemini } from '@/utils/geminiClient'

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    currentPhase: 'start',
    dealtCards: [],
    selectedPairs: {},
    generatedTitle: '',
    generatedPoem: '',
    isGeneratingPoem: false,
    poemGenerationError: null,
  }),

  getters: {
    /**
     * 5枚すべてのカードが選択されているかチェック
     */
    isAllSelected: (state): boolean => {
      return Object.keys(state.selectedPairs).length === 5
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
      this.dealtCards = selectRandomCards(cardsData as ConditionCard[], 5)
      this.selectedPairs = {}
      this.generatedTitle = ''
      this.generatedPoem = ''
      this.isGeneratingPoem = false
      this.poemGenerationError = null
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
      // タイトル生成（ルールベース）
      this.generatedTitle = generateTitle(this.selectedPairsArray)

      // LLMによるポエム生成
      this.isGeneratingPoem = true
      this.poemGenerationError = null

      try {
        this.generatedPoem = await generatePoemWithGemini({
          selectedPairs: this.selectedPairsArray,
        })
        this.currentPhase = 'result'
      } catch (error) {
        this.poemGenerationError = error instanceof Error
          ? error.message
          : 'ポエムの生成に失敗しました'
        // エラー時はデフォルトメッセージを使用
        this.generatedPoem = 'あなたの選んだ言葉が、新しい物語を紡ぎます。'
        this.currentPhase = 'result'
      } finally {
        this.isGeneratingPoem = false
      }
    },

    /**
     * ポエム生成をリトライ
     */
    async retryPoemGeneration() {
      this.isGeneratingPoem = true
      this.poemGenerationError = null

      try {
        this.generatedPoem = await generatePoemWithGemini({
          selectedPairs: this.selectedPairsArray,
        })
      } catch (error) {
        this.poemGenerationError = error instanceof Error
          ? error.message
          : 'ポエムの生成に失敗しました'
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
      this.isGeneratingPoem = false
      this.poemGenerationError = null
    },
  },
})
