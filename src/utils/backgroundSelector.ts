/**
 * 利用可能な背景画像のリスト
 * bg_1.png から bg_13.png まで
 */
export const BACKGROUND_IMAGES = Array.from({ length: 13 }, (_, i) => `/img/bg_${i + 1}.png`)

/**
 * ランダムに背景画像を選択する
 * @returns 選択された背景画像のパス
 */
export function selectRandomBackground(): string {
  const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length)
  return BACKGROUND_IMAGES[randomIndex]
}
