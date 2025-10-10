# マンションポエマー

現実という名の素材を、言葉という名の芸術へ。

マンション広告風のポエムを生成するインタラクティブなWebアプリケーション。

## 🎯 概要

5つの条件カードから詩的な言い換えを選び、それらを組み合わせて一つの洗練されたマンション広告文を生成します。Google Gemini APIを使用して、選択された要素を統合・昇華した本格的なマンションポエムを作成します。

## ✨ 機能

- **カード選択システム**: 5枚の条件カードから、それぞれポエムを選択
- **AI統合**: Gemini Flash APIで選択されたポエムを統合・再構築
- **ラグジュアリーUI**: ダークテーマと明朝体フォントによる高級感のあるデザイン
- **レスポンシブ対応**: PC・モバイル両対応
- **背景画像表示**: 生成されたポエムを美しい背景画像の上に表示

## 🛠️ 技術スタック

- **フロントエンド**: Vue 3 + TypeScript + Vite
- **状態管理**: Pinia
- **ルーティング**: Vue Router
- **テスト**: Vitest + Vue Test Utils
- **品質保証**: TypeScript + Husky (pre-commit hooks)
- **デプロイ**: Cloudflare Workers + Assets
- **データストア**: Cloudflare KV + D1
- **AI**: Google Gemini Flash (gemini-flash-latest)

## 📦 開発環境のセットアップ

### 前提条件

- Node.js 18以上
- npm

### インストール

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

開発サーバーは `http://localhost:5173` で起動します。

### ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに出力されます。

## 🚀 Cloudflare Workersへのデプロイ

### 前提条件

- Cloudflareアカウント（無料プランでOK）
- Google Gemini APIキー

### 1. Cloudflare Secrets Storeにシークレットを登録

```bash
# Wranglerにログイン
npx wrangler login

# Secrets Storeを作成
npx wrangler secrets-store create mansion-poem-secrets

# 作成されたStore IDをメモしておく
# 例: Store ID: abc123def456...

# Gemini APIキーを登録
npx wrangler secrets-store secret put GEMINI_API_KEY --store-id=YOUR_STORE_ID
# プロンプトでAPIキーを入力
```

### 2. wrangler.tomlを設定

`wrangler.toml`の`store_id`を自分のStore IDに変更：

```toml
[[secrets_store_secrets]]
binding = "GEMINI_API_KEY"
store_id = "YOUR_STORE_ID"  # ← ここを変更
secret_name = "GEMINI_API_KEY"
```

### 3. Worker名の変更（オプション）

`wrangler.toml`の`name`を変更してカスタムドメインを設定：

```toml
name = "your-worker-name"  # your-worker-name.workers.dev でアクセス可能
```

### 4. デプロイ

```bash
npm run deploy
```

デプロイが成功すると、以下のようなメッセージが表示されます：

```
✨ Successfully deployed mansionpoem
🌍 https://mansionpoem.your-account.workers.dev
```

## 🎨 開発用プレビュー画面

レイアウトの調整やデザイン確認のため、ホットリロード対応のプレビュー画面を用意しています：

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで以下にアクセス
http://localhost:5173/dev-preview
```

**機能:**
- 複数のサンプルデータを切り替えて表示
- 短いポエム、長いポエム、特殊なタイトルなど様々なパターン
- ランダム選択機能
- ホットリロード対応（コード変更が即座に反映）

このプレビュー画面を使うことで、UI操作なしに様々なレイアウトパターンを素早く確認できます。

## 📝 スクリプト

```bash
# 開発サーバー起動
npm run dev

# 型チェック
npm run typecheck

# テスト実行（watch mode）
npm run test

# テスト実行（一度だけ）
npm run test:run

# テストUI起動
npm run test:ui

# カバレッジ計測
npm run test:coverage

# ビルド
npm run build

# プレビュー（ビルド後のプレビュー）
npm run preview

# デプロイ（ビルド + Cloudflare Workersへデプロイ）
npm run deploy

# カードデータ変換
npm run generate-cards
```

## 🔧 KV/D1管理コマンド

### KVへのプロンプト更新

```bash
# prompt.txtをKVに反映
npx wrangler kv key put "prompt:poem_generation" --path="src/data/prompt.txt" --namespace-id 52e86897f88e44bda74c9bde3e3a1807
```

### KVへのカードデータ更新

```bash
# cards.jsonをKVに反映
npx wrangler kv key put "cards:all" --path="src/data/cards.json" --namespace-id 52e86897f88e44bda74c9bde3e3a1807
```

### D1ログのダウンロード

```bash
# generation_logsテーブルをJSON形式でダウンロード
npx wrangler d1 execute mansion-poem-db --remote --command "SELECT * FROM generation_logs" --json > generation_logs.json

# CSVとして扱いたい場合は、jqで変換
cat generation_logs.json | jq -r '.[0].results[] | [.id, .timestamp, .title, .poem_text, .selected_cards] | @csv' > generation_logs.csv
```

### D1テーブルの確認

```bash
# テーブル一覧
npx wrangler d1 execute mansion-poem-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"

# ログ件数の確認
npx wrangler d1 execute mansion-poem-db --remote --command "SELECT COUNT(*) as count FROM generation_logs"

# 最新10件の確認
npx wrangler d1 execute mansion-poem-db --remote --command "SELECT * FROM generation_logs ORDER BY timestamp DESC LIMIT 10"
```

## 🏗️ プロジェクト構造

```
mansion_poem/
├── src/
│   ├── assets/          # 静的アセット
│   ├── components/      # Vueコンポーネント
│   │   ├── cards/       # カード関連コンポーネント
│   │   ├── common/      # 共通コンポーネント
│   │   └── modals/      # モーダルコンポーネント
│   ├── data/            # カードデータ
│   ├── stores/          # Piniaストア
│   ├── types/           # TypeScript型定義
│   ├── utils/           # ユーティリティ関数
│   ├── views/           # ページコンポーネント
│   ├── worker.ts        # Cloudflare Workerエントリーポイント
│   ├── App.vue          # ルートコンポーネント
│   └── main.ts          # アプリケーションエントリーポイント
├── public/              # 公開静的ファイル
├── docs/                # ドキュメント
├── wrangler.toml        # Cloudflare Workers設定
└── package.json
```

## 🎨 カスタマイズ

### 背景画像の変更

`public/img/bg_1.png` を置き換えることで、結果画面の背景画像を変更できます。

### カードデータの編集

カードデータは `src/data/cards.json` で管理されています。
編集後、本番環境に反映するには以下のコマンドを実行してください：

```bash
npx wrangler kv key put "cards:all" --path="src/data/cards.json" --namespace-id 52e86897f88e44bda74c9bde3e3a1807
```

### プロンプトの調整

Gemini APIへのプロンプトは `src/data/prompt.txt` で管理されています。
編集後、本番環境に反映するには以下のコマンドを実行してください：

```bash
npx wrangler kv key put "prompt:poem_generation" --path="src/data/prompt.txt" --namespace-id 52e86897f88e44bda74c9bde3e3a1807
```

## 🧪 品質保証

このプロジェクトは以下の品質ゲートを備えています：

### pre-commit hooks
コミット時に自動実行される品質チェック：
- **型チェック**: `vue-tsc --noEmit --skipLibCheck`
- **テスト実行**: すべてのテストが成功することを確認

### テスト構成
- **フレームワーク**: Vitest + Vue Test Utils
- **環境**: happy-dom（軽量DOMエミュレーション）
- **カバレッジ**: v8プロバイダー
- **テストヘルパー**: モックファクトリー、状態セットアップヘルパー
- **テスト対象**:
  - コンポーネント（AppButton、ConditionCard、PoemCard等）
  - ビュー（ResultView - UI操作なしでテスト可能）
  - ストア（gameStore）
  - ユーティリティ関数（cardSelector、titleGenerator等）

### 実行方法
```bash
# ウォッチモードでテスト実行
npm run test

# 一度だけテスト実行
npm run test:run

# UIでテスト結果を確認
npm run test:ui

# カバレッジレポート生成
npm run test:coverage
```

### テストヘルパーの使い方

UI操作を経由せずに、直接結果画面の状態をテストできます：

```typescript
import { setupResultViewState, createMockGameState } from '@/test-utils'

// モックデータを生成
const mockState = createMockGameState()

// 結果画面の状態を直接セットアップ（ボタンクリック不要）
const { pinia, store } = setupResultViewState(mockState)

// これでResultViewをマウントしてテスト可能
const wrapper = mount(ResultView, {
  global: { plugins: [pinia] }
})
```

カスタムデータでのテスト：

```typescript
import { createMockSelectedPair, setupResultViewState } from '@/test-utils'

const customState = {
  selectedPairs: [
    createMockSelectedPair({ /* カスタマイズ */ }),
    // ... 残り4つ
  ],
  generatedTitle: 'カスタムタイトル',
  generatedPoem: 'カスタムポエム',
}

const { pinia } = setupResultViewState(customState)
```

## 🔐 セキュリティ

- **APIキー管理**: Gemini APIキーはCloudflare Secrets Storeで安全に管理
- **サーバーサイド処理**: APIキーはWorker側で使用され、クライアントに公開されません
- **環境分離**: 開発環境と本番環境でシークレットを分離可能

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

## 🙏 謝辞

- **Google Gemini API**: ポエム生成のAIエンジン
- **Cloudflare Workers**: サーバーレスデプロイ環境
- **Vue.js**: フロントエンドフレームワーク
