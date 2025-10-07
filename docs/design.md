# マンションポエマー 設計書

## 1. アーキテクチャ概要

### 1.1. システム構成
- **フロントエンド**: Vue 3 + TypeScript + Vite
- **デプロイ**: Cloudflare Pages（静的サイトホスティング）
- **状態管理**: Pinia（Vue 3公式推奨）
- **ルーティング**: Vue Router
- **スタイリング**: CSS Modules または Scoped CSS

### 1.2. アーキテクチャパターン
- **コンポーネントベースアーキテクチャ**: 再利用可能なVueコンポーネント
- **状態管理の集中化**: Piniaストアでゲーム状態を管理
- **単方向データフロー**: 状態の変更はアクションを通じてのみ実行

## 2. ディレクトリ構造

```
mansion_poem/
├── src/
│   ├── components/          # 再利用可能なUIコンポーネント
│   │   ├── cards/
│   │   │   ├── ConditionCard.vue
│   │   │   ├── PoemCard.vue
│   │   │   └── CardHand.vue
│   │   ├── modals/
│   │   │   └── PoemSelectionModal.vue
│   │   └── common/
│   │       └── AppButton.vue
│   ├── views/              # ページコンポーネント
│   │   ├── StartView.vue
│   │   ├── GameView.vue
│   │   └── ResultView.vue
│   ├── stores/             # Piniaストア
│   │   └── gameStore.ts
│   ├── types/              # TypeScript型定義
│   │   └── card.ts
│   ├── data/               # 静的データ
│   │   └── cards.json
│   ├── utils/              # ユーティリティ関数
│   │   ├── cardSelector.ts
│   │   └── titleGenerator.ts
│   ├── router/             # ルーティング設定
│   │   └── index.ts
│   ├── App.vue
│   └── main.ts
├── public/
├── docs/
│   ├── requirements.txt
│   └── design.md
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 3. データモデル

### 3.1. Card型定義

```typescript
// types/card.ts

export interface PoemOption {
  id: string;
  poem_text: string;
}

export interface ConditionCard {
  id: string;
  category: string;
  condition_text: string;
  poems: PoemOption[];
}

export interface SelectedPair {
  conditionCard: ConditionCard;
  selectedPoem: PoemOption;
}
```

### 3.2. ゲーム状態（Piniaストア）

```typescript
// stores/gameStore.ts

export interface GameState {
  // 現在のゲーム画面
  currentPhase: 'start' | 'game' | 'result';

  // ランダムに選ばれた5枚の条件カード
  dealtCards: ConditionCard[];

  // プレイヤーが選択したカードペア
  selectedPairs: Map<string, SelectedPair>; // key: conditionCard.id

  // 生成されたチラシのタイトル
  generatedTitle: string;
}
```

## 4. 画面遷移フロー

```
[StartView]
    ↓ 「創造を開始する」ボタンクリック
[GameView]
    ↓ 5枚すべて選択 → 「チラシを生成する」ボタンクリック
[ResultView]
    ↓ 「もう一度創造する」ボタンクリック
[StartView]
```

## 5. コンポーネント設計

### 5.1. StartView
- **責務**: ゲーム開始画面の表示
- **UI要素**:
  - タイトル表示
  - 開始ボタン
- **アクション**:
  - 開始ボタンクリック → `gameStore.startGame()` → GameViewへ遷移

### 5.2. GameView
- **責務**: カード選択画面の管理
- **子コンポーネント**:
  - `CardHand`: 5枚の条件カードを表示
  - `PoemSelectionModal`: ポエム選択モーダル
- **状態**:
  - 選択中の条件カード
  - モーダルの開閉状態
- **アクション**:
  - 条件カードクリック → モーダル表示
  - ポエム選択 → `gameStore.selectPoem()` → カードに選択済みマーク
  - 5枚すべて選択完了 → 「チラシを生成する」ボタン有効化
  - ボタンクリック → `gameStore.generateFlyer()` → ResultViewへ遷移

### 5.3. ResultView
- **責務**: 完成したチラシの表示
- **UI要素**:
  - 生成されたタイトル
  - 5組の条件×ポエムリスト
  - 締めの一文
  - 「もう一度創造する」ボタン
- **アクション**:
  - ボタンクリック → `gameStore.reset()` → StartViewへ遷移

### 5.4. コンポーネント間のデータフロー

```
GameStore (State)
    ↓ (provide/inject or props)
CardHand ← dealtCards, selectedPairs
    ↓ @card-click
PoemSelectionModal ← selectedCard.poems
    ↓ @poem-selected
GameStore.selectPoem(conditionId, poemId)
```

## 6. 主要ロジック

### 6.1. カードのランダム選択（cardSelector.ts）

```typescript
export function selectRandomCards(
  allCards: ConditionCard[],
  count: number = 5
): ConditionCard[] {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

### 6.2. タイトル生成ロジック（titleGenerator.ts）

**要求仕様**: 選ばれたカードの中から最も強いものが採用される

**実装方針**:
1. 各カテゴリに優先度を設定（例: 「周辺環境」＞「交通アクセス」＞「室内・仕様」）
2. 優先度の高いカテゴリの選択されたポエムからタイトルを生成
3. または、ポエムテキストの文字数が最も長いものを採用

```typescript
export function generateTitle(selectedPairs: SelectedPair[]): string {
  // カテゴリ優先度マップ
  const categoryPriority: Record<string, number> = {
    '周辺環境': 3,
    '交通アクセス': 2,
    '室内・仕様': 1,
  };

  // 優先度順にソート
  const sorted = [...selectedPairs].sort((a, b) => {
    const priorityA = categoryPriority[a.conditionCard.category] || 0;
    const priorityB = categoryPriority[b.conditionCard.category] || 0;
    return priorityB - priorityA;
  });

  // 最優先のポエムをタイトルとして使用
  return sorted[0]?.selectedPoem.poem_text || 'あなただけの物語。';
}
```

### 6.3. ゲーム状態管理（gameStore.ts）

```typescript
// stores/gameStore.ts
import { defineStore } from 'pinia';
import { ConditionCard, SelectedPair } from '@/types/card';
import cardsData from '@/data/cards.json';
import { selectRandomCards } from '@/utils/cardSelector';
import { generateTitle } from '@/utils/titleGenerator';

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    currentPhase: 'start',
    dealtCards: [],
    selectedPairs: new Map(),
    generatedTitle: '',
  }),

  getters: {
    isAllSelected: (state) => state.selectedPairs.size === 5,
    selectedPairsArray: (state): SelectedPair[] =>
      Array.from(state.selectedPairs.values()),
  },

  actions: {
    startGame() {
      this.dealtCards = selectRandomCards(cardsData as ConditionCard[], 5);
      this.selectedPairs.clear();
      this.currentPhase = 'game';
    },

    selectPoem(conditionCardId: string, poemId: string) {
      const card = this.dealtCards.find(c => c.id === conditionCardId);
      const poem = card?.poems.find(p => p.id === poemId);

      if (card && poem) {
        this.selectedPairs.set(conditionCardId, {
          conditionCard: card,
          selectedPoem: poem,
        });
      }
    },

    generateFlyer() {
      this.generatedTitle = generateTitle(this.selectedPairsArray);
      this.currentPhase = 'result';
    },

    reset() {
      this.currentPhase = 'start';
      this.dealtCards = [];
      this.selectedPairs.clear();
      this.generatedTitle = '';
    },
  },
});
```

## 7. UI/UXデザイン指針

### 7.1. カードデザイン
- **条件カード**:
  - 未選択: グレートーン
  - 選択済み: カラー（緑系）+ チェックマーク
  - カテゴリラベル表示

- **ポエムカード**:
  - ホバー時: 拡大・影効果
  - クリック時: アニメーション

### 7.2. レスポンシブデザイン
- PC: カードを横並び（5枚）
- スマートフォン: カードを縦スクロール
- モーダル: 画面中央表示、背景オーバーレイ

### 7.3. アクセシビリティ
- キーボード操作対応（Tab, Enter）
- ARIA属性の適切な使用
- カラーコントラスト比の確保

## 8. データ構造拡張案

現在のカードデータ（`cards.json`）に加え、以下の拡張が可能:

```json
{
  "id": "condition-01",
  "category": "交通アクセス",
  "condition_text": "駅徒歩20分",
  "priority": 2,  // タイトル生成用の優先度
  "poems": [
    {
      "id": "poem-01-a",
      "poem_text": "都心と程よい距離を保つ、静寂の丘。",
      "tone": "poetic"  // ポエムのトーン（将来的なフィルタリング用）
    }
  ]
}
```

## 9. テスト戦略

### 9.1. 単体テスト（Vitest）
- `cardSelector.ts`: ランダム選択ロジックのテスト
- `titleGenerator.ts`: タイトル生成ロジックのテスト
- `gameStore.ts`: ストアのアクション・ゲッターのテスト

### 9.2. コンポーネントテスト（Vue Test Utils）
- 各Vueコンポーネントのレンダリング確認
- ユーザーインタラクションのシミュレーション

### 9.3. E2Eテスト（Playwright / Cypress）
- ユーザーストーリーに基づくシナリオテスト
- US-01 → US-05までの一連のフロー

## 10. パフォーマンス考慮事項

- **コード分割**: Vue Routerの`lazy loading`を使用
- **画像最適化**: 必要に応じてWebP形式を使用
- **バンドルサイズ**: Viteのビルド最適化を活用
- **初回ロード**: Critical CSSのインライン化

## 11. デプロイメント

### 11.1. Cloudflare Pagesへのデプロイ手順
1. GitHubリポジトリとの連携
2. ビルドコマンド: `npm run build`
3. 出力ディレクトリ: `dist`
4. 環境変数: 特になし（静的サイトのため）

### 11.2. CI/CD
- GitHub Actionsでのリントチェック
- プルリクエスト時の自動ビルド確認

## 12. 今後の拡張可能性

- **カードデータの外部化**: CMSからのデータ取得
- **ソーシャルシェア機能**: 生成されたチラシのシェア
- **ユーザー投稿**: オリジナルのポエムを投稿
- **スコアリング**: ポエムの組み合わせに応じた評価
- **アニメーション強化**: カード選択時のマイクロインタラクション
- **多言語対応**: i18nの導入

---

**作成日**: 2025-10-07
**バージョン**: 1.0
**作成者**: Claude Code
