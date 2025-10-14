/**
 * キャッチコピー配列からランダムに20個を選択する
 * Fisher-Yatesシャッフルを使用して重複なく選択
 *
 * @param catchphrases キャッチコピーの配列
 * @returns ランダムに選択された最大20個のキャッチコピー
 */
export function selectRandomCatchphrases(catchphrases: string[]): string[] {
  if (catchphrases.length === 0) {
    return []
  }

  // 元の配列をコピー
  const shuffled = [...catchphrases]

  // Fisher-Yatesシャッフル
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // 最初の20個を返す（配列が20未満の場合は全て）
  return shuffled.slice(0, Math.min(20, shuffled.length))
}
