# Mansion Poem - プロジェクト概要

## プロジェクトの目的
マンション広告のキャッチコピー風のポエムを生成するWebアプリケーション。
ユーザーが「現実」カードと「言い換え」カードを選択し、AI（Google Gemini）がそれを元に詩的な広告文とタイトルを生成する。

## 技術スタック
- **フロントエンド**: Vue 3 (Composition API) + TypeScript + Vite
- **状態管理**: Pinia
- **バックエンド**: Cloudflare Workers
- **AI**: Google Gemini Flash API
- **ストレージ**: Cloudflare KV (プロンプトテンプレート保存)
- **テスト**: Vitest + Vue Test Utils
- **デプロイ**: Cloudflare Workers (https://mansionpoem.masahiro-hibi.workers.dev)

## プロジェクト構造

### 主要ディレクトリ
```
src/
├── components/
│   ├── cards/          # ConditionCard, PoemCard
│   ├── common/         # AppButton
│   └── layouts/        # LayoutA, LayoutB, LayoutC (結果表示レイアウト)
├── data/
│   ├── cards.json      # 現実カード・言い換えカードデータ (66件)
│   ├── catchphrases.json  # 実在のマンションキャッチコピー (110件)
│   └── prompt.txt      # Gemini APIへのプロンプトテンプレート
├── stores/
│   └── gameStore.ts    # ゲーム全体の状態管理
├── types/
│   ├── card.ts         # カード・ゲーム状態の型定義
│   └── layout.ts       # レイアウト関連の型定義
├── utils/
│   ├── backgroundSelector.ts  # 背景画像のランダム選択 (13枚)
│   ├── cardSelector.ts        # カードの抽選・競合解消
│   ├── copySelector.ts        # キャッチコピーのランダム選択 (20件)
│   ├── geminiClient.ts        # Gemini API クライアント
│   └── titleGenerator.ts      # フォールバック用タイトル生成
├── views/
│   ├── StartView.vue   # スタート画面
│   ├── CardSelect.vue  # カード選択画面
│   ├── ResultView.vue  # 結果表示画面
│   └── DevPreview.vue  # 開発用プレビュー画面
└── worker.ts           # Cloudflare Worker エントリーポイント

public/
└── img/                # 背景画像 (bg_1.png ~ bg_13.png)
```

## 主要な機能フロー

### 1. カード選択フェーズ
- `cardSelector.ts` が全カードから5枚を抽選
- カテゴリ競合時はランダムに1枚選択（Fisher-Yates shuffle使用）
- ユーザーが各「現実カード」に対して「言い換えカード」を選択

### 2. ポエム生成フェーズ
- `backgroundSelector.ts` が13枚の背景画像からランダムに1枚選択
- `copySelector.ts` が110個のキャッチコピーから20個をランダム選択
- `worker.ts` が選択されたペアと20個のキャッチコピーをプロンプトに埋め込み
- Gemini API にリクエスト送信
- レスポンスはJSON形式: `{title: string, poem: string}`

### 3. 結果表示フェーズ
- `ResultView.vue` が3種類のレイアウト (A, B, C) から1つを選択
- 動的に選ばれた背景画像、生成されたタイトルとポエムを表示

## 重要な実装パターン

### TDD (テスト駆動開発)
- 全ユーティリティ関数にテストを実装
- テストカバレッジ: 60/60 パス

### Fisher-Yates Shuffle
- `cardSelector.ts` と `copySelector.ts` でランダム選択に使用
- 各要素が等確率で選ばれることを保証

### JSON形式のLLMレスポンス
```json
{
  "title": "選択されたキャッチコピー",
  "poem": "生成された広告本文"
}
```
- コードブロック (````json...````) 対応のパース処理実装済み

## データファイル

### cards.json
- 66枚のカード (conditionCards + poemCards)
- 各カードはカテゴリ、強度、テキストを持つ

### catchphrases.json
- 110個の実在マンションキャッチコピー
- タイトル選択の候補として使用

### prompt.txt
- Cloudflare KV に保存
- プレースホルダー: `{SELECTED_PAIRS}`, `{TITLE_CANDIDATES}`
- 更新コマンド:
```bash
npx wrangler kv key put "prompt:poem_generation" \
  --path="src/data/prompt.txt" \
  --namespace-id 52e86897f88e44bda74c9bde3e3a1807
```

## デプロイ設定 (wrangler.toml)

### 環境変数・バインディング
- `CARDS_KV`: KVネームスペース (プロンプト保存)
- `DB`: D1データベース (mansion-poem-db)
- `GEMINI_API_KEY`: シークレット
- `ASSETS`: 静的アセット (`./dist`)

### デプロイコマンド
```bash
npm run build
npx wrangler deploy
```

## 開発フロー

### テスト実行
```bash
npm run test:run       # テスト実行
npm run test:coverage  # カバレッジ付き
npm run typecheck      # 型チェック
```

### プレビュー
- DevPreview.vue で開発環境限定のプレビュー可能
- 各レイアウト (A, B, C) の動作確認用

## 重要な実装メモ

### 背景画像の配置
- 画像は `public/img/` に配置（Viteが `dist/img/` にコピー）
- `img/` 直下に置くとデプロイ時にバンドルされない

### レイアウトシステム
- LayoutA: 中央配置、シンプル
- LayoutB: 右上に大きな一文、左下に残りのテキスト
- LayoutC: スクロール式、行ごとにフェードイン

### エラーハンドリング
- API失敗時は `titleGenerator.ts` でフォールバックタイトル生成
- エラーメッセージを表示し、「再生成」ボタンを提供
