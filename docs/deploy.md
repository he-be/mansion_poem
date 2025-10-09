# Cloudflare Workers デプロイ手順書 (2025年最新版)

## 📋 概要

このガイドでは、Vite + Reactアプリケーションを**Cloudflare Workers & Pages**にデプロイする手順を説明します。最新のCloudflare Workers Assetsを使用し、Secrets StoreでGemini APIキーを安全に管理します。

### ✨ 最新のCloudflare Workers & Pages

2025年現在、Cloudflareは**Workers & Pages**として統合されており、今後の開発投資はWorkersに集中しています。Workers Assetsを使うことで、static assetsとサーバーサイドロジックを単一のWorkerで配信できます。

---

## 🎯 アーキテクチャ

```
ユーザー
   ↓
Cloudflare Workers
   ├─ Static Assets (Vite build成果物: HTML, CSS, JS)
   └─ API Worker (Gemini API呼び出し)
          ↓
   Secrets Store (GEMINI_API_KEY)
          ↓
   Google Gemini API
```

---

## 📝 前提条件

- [x] Cloudflareアカウント (無料プランでOK)
- [x] Node.js 18以上がインストール済み
- [x] Secrets StoreにGEMINI_API_KEYが保存済み
- [x] デプロイ先: `masahiro-hibi.workers.dev`

---

## 🚀 デプロイ手順

### ステップ1: Wranglerのインストール

```bash
# プロジェクトルートで実行
npm install -D wrangler@latest
```

### ステップ2: wrangler.toml の作成

プロジェクトルートに `wrangler.toml` を作成します:

```toml
name = "masahiro-hibi"
main = "src/worker.ts"
compatibility_date = "2025-10-09"
compatibility_flags = ["nodejs_compat"]

# Static Assets設定
[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

# Secrets Store バインディング
[[secrets_store_secrets]]
binding = "GEMINI_API_KEY"
store_id = "YOUR_STORE_ID"  # ダッシュボードから取得
secret_name = "GEMINI_API_KEY"

# Workers.dev サブドメイン設定
workers_dev = true
```

> **注意**: `YOUR_STORE_ID` は、Cloudflare Dashboard の Secrets Store タブから取得してください。

---

### ステップ3: Worker スクリプトの作成

`src/worker.ts` を作成します:

```typescript
// Cloudflare Workers のエントリーポイント
export interface Env {
  ASSETS: Fetcher;
  GEMINI_API_KEY: string; // Secrets Store から注入される
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API エンドポイント: /api/generate-poem
    if (url.pathname === '/api/generate-poem' && request.method === 'POST') {
      return handleGeneratePoem(request, env);
    }

    // Static Assets を配信 (React SPA)
    return env.ASSETS.fetch(request);
  },
};

async function handleGeneratePoem(request: Request, env: Env): Promise<Response> {
  try {
    const { prompt } = await request.json();

    // Gemini APIを呼び出し
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY, // Secrets Storeから取得
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    const poem = data.candidates[0]?.content?.parts[0]?.text || '';

    return new Response(JSON.stringify({ poem }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error generating poem:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate poem' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

---

### ステップ4: フロントエンドの修正

`src/utils/geminiClient.ts` を修正し、APIエンドポイントを変更します:

```typescript
export async function generatePoem(prompt: string): Promise<string> {
  try {
    // Worker の API エンドポイントを呼び出し
    const response = await fetch('/api/generate-poem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.poem;
  } catch (error) {
    console.error('Error generating poem:', error);
    throw error;
  }
}
```

---

### ステップ5: TypeScript型定義の追加

`src/cloudflare-env.d.ts` を作成します:

```typescript
interface Env {
  ASSETS: Fetcher;
  GEMINI_API_KEY: string;
}
```

---

### ステップ6: package.json にデプロイスクリプト追加

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler deploy"
  }
}
```

---

### ステップ7: Secrets Store の設定確認

#### ダッシュボードで確認:

1. Cloudflare Dashboard → **Secrets Store** タブ
2. `GEMINI_API_KEY` が存在することを確認
3. **Store ID** をコピーして `wrangler.toml` に記入

#### CLI で確認 (オプション):

```bash
# Store ID を取得
npx wrangler secrets-store store list

# シークレット一覧を確認
npx wrangler secrets-store secret list --store-id=YOUR_STORE_ID
```

---

### ステップ8: デプロイ実行

```bash
# ビルド & デプロイ
npm run deploy
```

デプロイが成功すると、以下のようなメッセージが表示されます:

```
✨ Successfully deployed masahiro-hibi
🌍 https://masahiro-hibi.workers.dev
```

---

## 🧪 動作確認

1. ブラウザで `https://masahiro-hibi.workers.dev` にアクセス
2. ポエムジェネレーターのUIが表示されることを確認
3. テキストを入力してポエムが生成されることを確認

---

## 🔐 セキュリティのベストプラクティス

### ✅ 推奨事項

- **Secrets Storeを使用**: APIキーをアカウントレベルで管理
- **WorkerでAPIキーを使用**: フロントエンドに公開されない
- **CORS設定**: 必要に応じて適切なOriginを設定

### ❌ 避けるべきこと

- フロントエンドで直接APIキーを使用
- 環境変数にAPIキーをプレーンテキストで保存
- `wrangler.toml` にAPIキーを直接記述

---

## 📊 Cloudflare Workers の特徴

### 🌍 グローバルエッジネットワーク
- 世界300以上のデータセンターで実行
- ユーザーに最も近い場所からレスポンス

### ⚡ 高速起動
- コールドスタートなし (V8 Isolates使用)
- ミリ秒単位でレスポンス

### 💰 コスト効率
- 無料プラン: 1日100,000リクエスト
- Static Assetsのリクエストは無料

### 🔧 開発体験
- ローカル開発: `wrangler dev`
- バージョン管理とロールバックをサポート

---

## 🛠️ トラブルシューティング

### Store IDが見つからない場合

```bash
# Storeを新規作成
npx wrangler secrets-store store create my-store --remote
```

### デプロイエラーが発生する場合

```bash
# Wranglerにログイン
npx wrangler login

# アカウント情報を確認
npx wrangler whoami
```

### ローカルで動作確認する場合

```bash
# ローカル開発サーバー起動
npx wrangler dev

# ブラウザで http://localhost:8787 にアクセス
```

---

## 📚 参考リンク

- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Secrets Store ドキュメント](https://developers.cloudflare.com/secrets-store/)
- [Workers Assets ガイド](https://developers.cloudflare.com/workers/static-assets/)
- [Wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/)

---

## 🎉 完了!

これで、Cloudflare Workersへのデプロイが完了しました。`https://masahiro-hibi.workers.dev` でアプリケーションが公開されています。

今後の機能追加や変更は、コードを修正して `npm run deploy` を実行するだけです!