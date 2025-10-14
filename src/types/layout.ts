/**
 * レイアウトスタイルの型定義
 */
export type LayoutStyle = 'A' | 'B' | 'C'

/**
 * レイアウトに渡すプロパティ
 */
export interface LayoutProps {
  title: string
  poem: string
  backgroundImage: string
}
