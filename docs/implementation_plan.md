# マンションポエマー 実装タスクリスト

## 実装方針

### フェーズ分け戦略
プロトタイプの実装を3つのフェーズに分け、段階的に機能を追加していく：

1. **Phase 1: 環境構築とコア機能** - 基本的なプロジェクト設定とデータ構造の実装
2. **Phase 2: UI実装** - コンポーネントとビューの実装
3. **Phase 3: 仕上げと検証** - スタイリング、テスト、デプロイ準備

### 技術的な優先順位
- **ロジック優先**: UIより先にストアとユーティリティを実装し、ロジックを確定
- **ボトムアップ**: 小さいコンポーネントから大きいビューへ積み上げ
- **早期検証**: 各フェーズ終了時に動作確認を実施

---

## Phase 1: 環境構築とコア機能 (Day 1-2)

### 1.1 プロジェクト初期化
- [ ] **TASK-001**: Vite + Vue 3 + TypeScriptプロジェクトの作成
  - `npm create vite@latest mansion_poem -- --template vue-ts`
  - 依存関係のインストール
- [ ] **TASK-002**: 必要なライブラリのインストール
  - `npm install vue-router pinia`
  - `npm install -D @types/node`
- [ ] **TASK-003**: TypeScript設定の調整
  - `tsconfig.json`でパスエイリアス（`@/`）を設定
  - `vite.config.ts`で`resolve.alias`を設定

### 1.2 ディレクトリ構造の構築
- [ ] **TASK-004**: src配下のディレクトリ作成
  - `src/components/{cards,modals,common}`
  - `src/views`
  - `src/stores`
  - `src/types`
  - `src/data`
  - `src/utils`
  - `src/router`

### 1.3 型定義とデータ
- [ ] **TASK-005**: TypeScript型定義の作成（`src/types/card.ts`）
  - `PoemOption`インターフェース
  - `ConditionCard`インターフェース
  - `SelectedPair`インターフェース
  - `GameState`インターフェース
- [ ] **TASK-006**: カードデータの作成（`src/data/cards.json`）
  - 要求仕様書のサンプルデータを基に最低10枚のカードを作成
  - 各カードに3つのポエムオプションを付与

### 1.4 ユーティリティ関数
- [ ] **TASK-007**: カードランダム選択ロジック（`src/utils/cardSelector.ts`）
  - `selectRandomCards`関数の実装
  - Fisher-Yatesシャッフルアルゴリズムを使用（より正確なランダム化）
- [ ] **TASK-008**: タイトル生成ロジック（`src/utils/titleGenerator.ts`）
  - `generateTitle`関数の実装
  - カテゴリ優先度マップの定義

### 1.5 状態管理
- [ ] **TASK-009**: Piniaストアのセットアップ（`src/main.ts`）
  - Piniaインスタンスの作成と登録
- [ ] **TASK-010**: ゲームストアの実装（`src/stores/gameStore.ts`）
  - ステート定義
  - ゲッター（`isAllSelected`, `selectedPairsArray`）
  - アクション（`startGame`, `selectPoem`, `generateFlyer`, `reset`）

**Phase 1 検証ポイント**:
- ブラウザのDevToolsでストアを操作し、状態変化を確認
- ユーティリティ関数を手動で呼び出し、出力を検証

---

## Phase 2: UI実装 (Day 3-5)

### 2.1 ルーティング設定
- [ ] **TASK-011**: Vue Routerのセットアップ（`src/router/index.ts`）
  - ルート定義（`/`, `/game`, `/result`）
  - ルーターインスタンスの作成
- [ ] **TASK-012**: `src/main.ts`にルーター登録
- [ ] **TASK-013**: `src/App.vue`の実装
  - `<RouterView>`の配置
  - グローバルスタイルの適用

### 2.2 共通コンポーネント
- [ ] **TASK-014**: `AppButton.vue`の実装
  - Props: `label`, `disabled`, `variant` (primary/secondary)
  - Emits: `click`
  - スタイル: 基本的なボタンデザイン

### 2.3 カード関連コンポーネント
- [ ] **TASK-015**: `ConditionCard.vue`の実装
  - Props: `card` (ConditionCard), `isSelected` (boolean)
  - Emits: `click`
  - 表示: カテゴリラベル、条件テキスト
  - スタイル: 選択状態の視覚的表現（チェックマーク、色変更）
- [ ] **TASK-016**: `PoemCard.vue`の実装
  - Props: `poem` (PoemOption)
  - Emits: `click`
  - 表示: ポエムテキスト
  - スタイル: ホバー効果、クリックアニメーション
- [ ] **TASK-017**: `CardHand.vue`の実装
  - Props: `cards` (ConditionCard[]), `selectedPairIds` (string[])
  - Emits: `card-click`
  - 表示: 5枚のカードをレスポンシブに配置
  - ロジック: 選択状態の判定とイベント伝播

### 2.4 モーダルコンポーネント
- [ ] **TASK-018**: `PoemSelectionModal.vue`の実装
  - Props: `isOpen` (boolean), `conditionCard` (ConditionCard | null)
  - Emits: `close`, `poem-selected`
  - 表示: 条件カードの情報 + 3つのポエム選択肢
  - スタイル: モーダルオーバーレイ、中央配置
  - アクセシビリティ: Escキーで閉じる、背景クリックで閉じる

### 2.5 ビュー実装
- [ ] **TASK-019**: `StartView.vue`の実装
  - ゲームストアの`startGame()`呼び出し
  - タイトル表示
  - 「創造を開始する」ボタン
  - ボタンクリックで`/game`へ遷移
- [ ] **TASK-020**: `GameView.vue`の実装
  - ローカルステート: `selectedCard` (モーダル用), `isModalOpen`
  - `CardHand`コンポーネントの配置
  - `PoemSelectionModal`の配置
  - 「チラシを生成する」ボタン（5枚選択完了時のみ有効）
  - イベントハンドリング: カードクリック → モーダル表示 → ポエム選択 → ストア更新
- [ ] **TASK-021**: `ResultView.vue`の実装
  - チラシ風デザインの実装
  - タイトル表示（`generatedTitle`）
  - 5組の条件×ポエムリスト表示
  - 締めの一文（「世界は、あなたの言葉で完成する。」）
  - 「もう一度創造する」ボタン → ストア`reset()` → `/`へ遷移

**Phase 2 検証ポイント**:
- US-01 → US-05のユーザーストーリーを手動で実行
- 各画面遷移が正しく動作することを確認
- レスポンシブデザインの確認（PC/スマホ）

---

## Phase 3: 仕上げと検証 (Day 6-7)

### 3.1 スタイリング強化
- [ ] **TASK-022**: グローバルスタイルの統一
  - フォント設定（游ゴシック、メイリオなど日本語フォント）
  - カラーパレットの定義（CSS変数）
  - レスポンシブブレークポイントの統一
- [ ] **TASK-023**: チラシデザインの洗練
  - `ResultView`のレイアウト調整
  - 不動産チラシ風のビジュアルデザイン
  - 印刷を意識したフォントサイズと余白
- [ ] **TASK-024**: アニメーション追加
  - 画面遷移時のフェードイン
  - カード選択時のマイクロインタラクション
  - モーダルの開閉アニメーション

### 3.2 アクセシビリティ改善
- [ ] **TASK-025**: ARIA属性の追加
  - ボタンに`aria-label`
  - モーダルに`role="dialog"`, `aria-modal="true"`
  - カードに`role="button"`, `tabindex="0"`
- [ ] **TASK-026**: キーボード操作対応
  - Tabキーでのフォーカス移動
  - Enterキーでのカード選択
  - Escキーでのモーダル閉じる

### 3.3 エラーハンドリングとエッジケース
- [ ] **TASK-027**: カードデータ不足時の対応
  - カードデータが5枚未満の場合のエラー表示
  - JSONパースエラーのハンドリング
- [ ] **TASK-028**: ストアの状態リセット確認
  - ページリロード時の動作確認
  - 複数回プレイ時の状態クリア確認

### 3.4 テスト
- [ ] **TASK-029**: ユニットテストの作成（Vitest）
  - `cardSelector.test.ts`: ランダム選択のテスト
  - `titleGenerator.test.ts`: タイトル生成のテスト
  - `gameStore.test.ts`: ストアのアクションテスト
- [ ] **TASK-030**: E2Eテストの作成（オプション）
  - Playwrightのセットアップ
  - US-01 → US-05の一連のフローをテスト

### 3.5 ビルドとデプロイ準備
- [ ] **TASK-031**: プロダクションビルドの確認
  - `npm run build`実行
  - `dist`ディレクトリの内容確認
  - バンドルサイズの確認
- [ ] **TASK-032**: Cloudflare Pagesへのデプロイ
  - GitHubリポジトリへのプッシュ
  - Cloudflare Pagesプロジェクトの作成
  - ビルド設定（`npm run build`, `dist`）
  - デプロイ実行とURL確認
- [ ] **TASK-033**: デプロイ後の動作確認
  - 本番環境での全フローテスト
  - スマートフォンでの実機確認
  - パフォーマンス計測（Lighthouse）

### 3.6 ドキュメント
- [ ] **TASK-034**: `README.md`の作成
  - プロジェクト概要
  - セットアップ手順
  - 開発サーバー起動方法
  - ビルド方法
  - デプロイ方法
- [ ] **TASK-035**: コードコメントの追加
  - 複雑なロジックへのコメント
  - コンポーネントのPropsとEmitsのドキュメント

**Phase 3 検証ポイント**:
- すべてのテストがパス
- デプロイされたアプリが正常に動作
- Lighthouseスコア: Performance 90+, Accessibility 90+

---

## 優先度と依存関係

### クリティカルパス（必須実装）
```
TASK-001 → TASK-002 → TASK-003 (環境構築)
    ↓
TASK-004 → TASK-005 → TASK-006 (データ準備)
    ↓
TASK-007 → TASK-008 → TASK-009 → TASK-010 (ロジック実装)
    ↓
TASK-011 → TASK-012 → TASK-013 (ルーティング)
    ↓
TASK-014 → TASK-015 → TASK-016 → TASK-017 (コンポーネント)
    ↓
TASK-018 (モーダル)
    ↓
TASK-019 → TASK-020 → TASK-021 (ビュー実装)
    ↓
TASK-031 → TASK-032 → TASK-033 (デプロイ)
```

### 並行作業可能なタスク
- TASK-022 〜 TASK-024（スタイリング）は、TASK-021完了後いつでも実施可能
- TASK-025 〜 TASK-026（アクセシビリティ）は、各コンポーネント実装後に追加可能
- TASK-029（テスト）は、対応する実装完了後いつでも実施可能

### オプショナルタスク（時間があれば）
- TASK-030: E2Eテスト
- TASK-024: アニメーション追加（基本的な動作には不要）

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Piniaの状態シリアライズ問題（Map型） | 中 | `selectedPairs`をMapではなくRecord型に変更検討 |
| カードデータの重複選択 | 低 | `selectRandomCards`でSet型を使用して重複排除 |
| モーダルのスクロール問題 | 低 | `body`に`overflow: hidden`を適用 |
| ルーター遷移時の状態リセット | 中 | `keep-alive`の使用、またはストアの永続化検討 |
| 日本語フォントの読み込み遅延 | 低 | システムフォントを優先、Webフォントはfallback |

---

## 開発スケジュール（7日間想定）

| 日 | タスク | 成果物 |
|----|--------|--------|
| Day 1 | TASK-001 〜 TASK-006 | プロジェクト構造とデータ |
| Day 2 | TASK-007 〜 TASK-010 | ストアとロジック |
| Day 3 | TASK-011 〜 TASK-017 | ルーティングとコンポーネント |
| Day 4 | TASK-018 〜 TASK-021 | モーダルとビュー |
| Day 5 | TASK-022 〜 TASK-026 | スタイリングとアクセシビリティ |
| Day 6 | TASK-027 〜 TASK-030 | テストとバグ修正 |
| Day 7 | TASK-031 〜 TASK-035 | デプロイとドキュメント |

---

## 完成の定義（DoD: Definition of Done）

各タスクは以下の条件を満たした時点で完了とする：

1. ✅ コードが実装され、エラーなくビルドできる
2. ✅ ローカル環境で期待通りに動作する
3. ✅ TypeScriptの型エラーがない
4. ✅ ESLintの警告がない（`npm run lint`）
5. ✅ 該当するユニットテストがパスする（該当する場合）
6. ✅ コードレビュー完了（チームがある場合）

プロジェクト全体の完成条件：

1. ✅ US-01 〜 US-05のすべてのユーザーストーリーが達成されている
2. ✅ PC、スマートフォンの両方で動作する
3. ✅ Cloudflare Pagesにデプロイ済み
4. ✅ README.mdが整備されている
5. ✅ バグがない、またはクリティカルな問題が解決されている

---

**作成日**: 2025-10-07
**バージョン**: 1.0
**作成者**: Claude Code
