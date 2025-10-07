import type { ConditionCard } from '@/types/card'

/**
 * Fisher-Yates シャッフルアルゴリズムを使用してカードをランダムに選択
 * @param allCards すべてのカード
 * @param count 選択するカード数（デフォルト: 5）
 * @returns ランダムに選択されたカード配列
 */
export function selectRandomCards(
  allCards: ConditionCard[],
  count: number = 5
): ConditionCard[] {
  if (allCards.length < count) {
    throw new Error(`カード数が不足しています。必要: ${count}枚、現在: ${allCards.length}枚`)
  }

  // 元の配列を変更しないようにコピー
  const shuffled = [...allCards]

  // Fisher-Yates シャッフル
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}
