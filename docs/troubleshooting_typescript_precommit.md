# TypeScript Pre-commit Hook トラブルシューティング

## 問題の概要

Gemini Flash API統合のコア機能実装をコミットしようとしたところ、pre-commit hookで設定した`vue-tsc`の型チェックがlint-staged実行時のみ失敗する問題が発生。

## 背景

### 実装内容
- Gemini Flash APIクライアント (src/utils/geminiClient.ts)
- GameStore へのLLM統合 (src/stores/gameStore.ts)
- GameState型定義の拡張 (src/types/card.ts)
- 30枚のカードデータ (src/data/cards.json)
- 環境変数設定 (.env.example, src/vite-env.d.ts)

### Pre-commit Hook設定
- husky + lint-staged を使用
- コミット前に`vue-tsc --noEmit`で型チェックを実行
- 品質チェックのスキップは厳禁（ユーザー要求）

## 発生している問題

### エラー内容

```
✖ vue-tsc --noEmit --skipLibCheck:
src/stores/gameStore.ts(2,61): error TS2307: Cannot find module '@/types/card' or its corresponding type declarations.
src/stores/gameStore.ts(3,23): error TS2732: Cannot find module '@/data/cards.json'. Consider using '--resolveJsonModule' to import module with '.json' extension.
src/stores/gameStore.ts(4,35): error TS2307: Cannot find module '@/utils/cardSelector' or its corresponding type declarations.
src/stores/gameStore.ts(5,31): error TS2307: Cannot find module '@/utils/titleGenerator' or its corresponding type declarations.
src/stores/gameStore.ts(6,40): error TS2307: Cannot find module '@/utils/geminiClient' or its corresponding type declarations.
src/utils/geminiClient.ts(8,35): error TS2307: Cannot find module '@/types/card' or its corresponding type declarations.
src/utils/geminiClient.ts(50,18): error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', or 'nodenext'.
```

### 重要な事実
- **ローカルでの直接実行は成功**: `npx vue-tsc --noEmit --skipLibCheck` を実行すると型チェックはパス
- **lint-staged経由での実行のみ失敗**: git commitトリガーでの実行時のみエラー

## 試行錯誤の履歴

### 試行1: tsconfig.jsonに`resolveJsonModule`を追加
```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    // ...
  }
}
```
**結果**: 失敗（エラー変わらず）

### 試行2: 環境変数の型定義追加
src/vite-env.d.ts に以下を追加:
```typescript
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```
**結果**: 失敗（`import.meta`のエラーは残る）

### 試行3: tsconfig.jsonの設定強化
```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "types": ["vite/client"],
    // ...
  }
}
```
**結果**: 失敗（エラー変わらず）

### 試行4: tsconfig.node.json の分離
ツール用の設定を分離:
```json
// tsconfig.node.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["vite.config.ts"]
}
```

tsconfig.jsonに参照追加:
```json
{
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```
**結果**: 失敗（エラー変わらず）

### 試行5: lint-stagedで明示的にtsconfigを指定
```json
{
  "lint-staged": {
    "*.{ts,tsx,vue}": [
      "vue-tsc --noEmit --skipLibCheck --project tsconfig.json"
    ]
  }
}
```
**結果**: 新しいエラー
```
error TS5042: Option 'project' cannot be mixed with source files on a command line.
```

## 根本原因の推測

1. **lint-stagedの動作**: lint-stagedはステージングされたファイルのパスを引数としてコマンドに渡す
2. **vue-tscの制約**: `--project`オプションを使用すると、コマンドライン引数でファイルを指定できない
3. **tsconfig.jsonの読み込み**: lint-staged実行時のカレントディレクトリまたは環境の問題で、tsconfig.jsonが正しく読み込まれていない可能性

## 現在の状態

### ファイル構成
```
mansion_poem/
├── tsconfig.json (moduleResolution: bundler, resolveJsonModule: true)
├── tsconfig.node.json (vite.config.ts用)
├── src/
│   ├── vite-env.d.ts (環境変数型定義)
│   ├── types/card.ts (GameState拡張済み)
│   ├── stores/gameStore.ts (LLM統合済み)
│   └── utils/geminiClient.ts (実装済み)
├── .husky/
│   └── pre-commit (npx lint-staged)
└── package.json (lint-staged設定)
```

### 現在のlint-staged設定
```json
{
  "lint-staged": {
    "*.{ts,tsx,vue}": [
      "vue-tsc --noEmit --skipLibCheck --project tsconfig.json"
    ]
  }
}
```

## 次に試すべきこと

### オプション1: lint-stagedの設定変更
ファイルパスを渡さず、プロジェクト全体をチェック:
```json
{
  "lint-staged": {
    "*.{ts,tsx,vue}": [
      "bash -c 'vue-tsc --noEmit --skipLibCheck'"
    ]
  }
}
```

### オプション2: 個別のスクリプト作成
package.jsonにスクリプトを追加:
```json
{
  "scripts": {
    "typecheck": "vue-tsc --noEmit --skipLibCheck"
  },
  "lint-staged": {
    "*.{ts,tsx,vue}": [
      "npm run typecheck"
    ]
  }
}
```

### オプション3: tsconfig.jsonのincludeを明示的に
現在の設定を確認して、必要なファイルが全て含まれているか検証

### オプション4: lint-stagedでファイルを無視
型チェックはプロジェクト全体で行い、個別ファイルは渡さない設定を探る

## 参考情報

- vue-tsc version: 5.9.3
- TypeScript設定: module: ESNext, target: ES2020
- ローカル実行は成功するため、TypeScript設定自体は正しい
- 問題はlint-staged実行時の環境またはコマンド引数の扱いにある

## 制約条件

- **品質チェックのスキップは不可**: ユーザーから明確に禁止されている
- **pre-commit hookは必須**: コミット前の型チェックは要件
- **型エラーがある状態でのコミットは許容できない**

---

作成日時: 2025-10-07
状態: 調査中
