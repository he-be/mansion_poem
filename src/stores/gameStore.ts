import { defineStore } from 'pinia'
import type { GameState, ConditionCard, SelectedPair } from '@/types/card'
import cardsData from '@/data/cards.json'
import { selectRandomCards } from '@/utils/cardSelector'
import { generateTitle } from '@/utils/titleGenerator'

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    currentPhase: 'start',
    dealtCards: [],
    selectedPairs: {},
    generatedTitle: '',
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
     */
    generateFlyer() {
      this.generatedTitle = generateTitle(this.selectedPairsArray)
      this.currentPhase = 'result'
    },

    /**
     * ゲームをリセットし、開始画面に戻る
     */
    reset() {
      this.currentPhase = 'start'
      this.dealtCards = []
      this.selectedPairs = {}
      this.generatedTitle = ''
    },
  },
})
