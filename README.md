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
- **デプロイ**: Cloudflare Workers + Assets
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

## 📝 スクリプト

```bash
# 開発サーバー起動
npm run dev

# 型チェック
npm run typecheck

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
