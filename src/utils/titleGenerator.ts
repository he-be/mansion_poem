import type { SelectedPair } from '@/types/card'

/**
 * カテゴリごとの優先度マップ
 * 数値が高いほど優先度が高い
 */
const categoryPriority: Record<string, number> = {
  '周辺環境': 3,
  '交通アクセス': 2,
  '室内・仕様': 1,
}

/**
 * 選択されたカードペアからチラシのタイトルを生成
 * 優先度の高いカテゴリのポエムをタイトルとして使用
 * @param selectedPairs 選択されたカードペアの配列
 * @returns 生成されたタイトル
 */
export function generateTitle(selectedPairs: SelectedPair[]): string {
  if (selectedPairs.length === 0) {
    return 'あなただけの物語。'
  }

  // 優先度順にソート
  const sorted = [...selectedPairs].sort((a, b) => {
    const priorityA = categoryPriority[a.conditionCard.category] || 0
    const priorityB = categoryPriority[b.conditionCard.category] || 0
    return priorityB - priorityA
  })

  // 最優先のポエムをタイトルとして使用
  return sorted[0].selectedPoem.poem_text
}
