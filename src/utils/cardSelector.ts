import type { ConditionCard } from '@/types/card'

/**
 * Fisher-Yates シャッフルアルゴリズムを使用して配列をシャッフル
 * @param array シャッフルする配列
 * @returns シャッフルされた配列
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * カテゴリ内で競合するカードをチェックし、ランダムに1枚選んで残す
 * @param cards カードの配列
 * @returns 競合を解消したカード配列と残りの山札
 */
function resolveConflicts(
  drawnCards: ConditionCard[],
  remainingDeck: ConditionCard[]
): { resolved: ConditionCard[]; deck: ConditionCard[] } {
  const categoryMap = new Map<string, ConditionCard[]>()

  // カテゴリごとにグループ化
  for (const card of drawnCards) {
    const existing = categoryMap.get(card.category) || []
    existing.push(card)
    categoryMap.set(card.category, existing)
  }

  const resolved: ConditionCard[] = []
  const toReturn: ConditionCard[] = []

  // 各カテゴリごとに処理
  for (const [_, cards] of categoryMap) {
    if (cards.length === 1) {
      // 競合なし - そのまま採用
      resolved.push(cards[0])
    } else {
      // 競合あり - ランダムに1枚選び、残りは山札に戻す
      const randomIndex = Math.floor(Math.random() * cards.length)
      const selected = cards[randomIndex]
      resolved.push(selected)
      toReturn.push(...cards.filter(c => c.id !== selected.id))
    }
  }

  return {
    resolved,
    deck: [...remainingDeck, ...toReturn]
  }
}

/**
 * 物理的なカードゲームを模した抽選システム
 * 山札から5枚引き、カテゴリ競合があれば引き直す
 * @param allCards すべてのカード
 * @param count 選択するカード数（デフォルト: 5）
 * @returns ランダムに選択され、競合が解消されたカード配列
 */
export function selectRandomCards(
  allCards: ConditionCard[],
  count: number = 5
): ConditionCard[] {
  if (allCards.length < count) {
    throw new Error(`カード数が不足しています。必要: ${count}枚、現在: ${allCards.length}枚`)
  }

  let deck = shuffleArray(allCards)
  let hand: ConditionCard[] = []

  // 競合が解消されるまで引き直す
  while (hand.length < count) {
    // 必要な枚数を引く
    const needed = count - hand.length
    const drawn = deck.slice(0, needed)
    deck = deck.slice(needed)

    // 既存の手札と合わせて競合チェック
    const combined = [...hand, ...drawn]
    const result = resolveConflicts(combined, deck)

    hand = result.resolved
    deck = shuffleArray(result.deck) // 戻したカードを混ぜる
  }

  return hand
}
