# DPO用データセット作成プラン

## 参照元
- Unsloth RL Guide: https://docs.unsloth.ai/get-started/reinforcement-learning-rl-guide
- GPT-OSS RL Guide: https://docs.unsloth.ai/new/gpt-oss-reinforcement-learning

## 概要
SFT済みモデル（gpt-oss-20b-mansion-poem-20epoch-mxfp4.gguf）を使用して、DPO（Direct Preference Optimization）用のデータセットを作成する。

## ⚠️ 重要な設計原則

### 1. AIに点数を付けさせるのはアンチパターン
**高評価に固まるため**、必ず**ペアワイズ比較**（A vs B のどちらが良いか）を使用し、わずかな差から強制的に判定させる。

### 2. DPOデータセットの構成
**すべてSFT済みモデルの生成結果のみを使用**。SFTに使用したデータセットの情報は利用してはならない。

### 3. モデル出力のパース
モデルはtool useでJSON（`{title: "...", poem: "..."}`）を返すため、必ずパースして`poem`フィールドを抽出する。

### 4. 全失敗時の処理
8回生成して全て不可の場合は**スキップ**（プロンプトも結果もデータセットに入れず、エラーログとして全て残す）。

## Unslothの推奨事項
- **最低データセット行数**: 500行以上
- **推奨RL手法**: GRPO、DPO、ORPO、KTO
- **データセット形式（DPO）**: `prompt`, `chosen`, `rejected` の3カラム
- **トレーニング推奨**: 最低300ステップ、1.5B+パラメータのモデル

## データセット仕様

### 形式
```json
{
  "prompt": "ユーザープロンプト（buildUserPromptで生成）",
  "chosen": "高品質な応答（Geminiが高評価した生成結果）",
  "rejected": "低品質な応答（ルール違反またはGeminiが低評価した生成結果）"
}
```

### 目標データ量
- **最低**: 500組（Unsloth推奨）
- **目標**: 1000組以上（品質向上のため）

### 必要なプロンプト数
- **500組達成**: 55プロンプト（500 ÷ 9組/プロンプト）
- **1000組達成**: 112プロンプト（1000 ÷ 9組/プロンプト）
- **2000組達成**: 223プロンプト（2000 ÷ 9組/プロンプト）

※スキップ発生を考慮して+10%のバッファを見込む

## データ生成手順

### 1. プロンプト準備
- `scripts/generate_ft_dataset.js`の`buildUserPrompt`関数を使用して新規作成する。既存のSFTデータセットからプロンプトは流用しない。

### 2. 応答生成
- **モデル**: gpt-oss-20b-mansion-poem-20epoch-mxfp4.gguf
- **生成数**: 1プロンプトあたり8個の応答を生成
- **冷却時間**: 10秒間隔（GPU過熱防止）
- **参考実装**: `dev-server/localLLM.js`

### 3. 品質評価（2段階フィルタリング）

#### A. ルールベースフィルタリング（第1段階）
8個の生成結果全てに対して、以下のルールを適用：

**前提**: モデルはtool useでJSON `{title: "...", poem: "..."}` を返す。
1. JSONパース（`dev-server/localLLM.js`と同様の処理）
2. `poem`フィールドを抽出
3. 日本語文字数とルールチェック

```javascript
function evaluateByRules(rawResponse) {
  // Step 1: JSONパース
  let parsed;
  try {
    // JSONコードブロック抽出（```json ... ``` 対応）
    const jsonMatch = rawResponse.match(/```json\s*\n?([\s\S]*?)\n?```/);
    const jsonText = jsonMatch ? jsonMatch[1] : rawResponse;
    parsed = JSON.parse(jsonText);

    if (!parsed.poem) {
      return { passed: false, reason: 'poemフィールド欠落', isParseFailed: true };
    }
  } catch (error) {
    return { passed: false, reason: 'JSONパース失敗', isParseFailed: true };
  }

  // Step 2: poem抽出とエスケープ改行変換
  let poem = parsed.poem.replace(/\\n/g, '\n');

  // Step 3: 日本語文字数チェック
  // ルール1: 日本語120文字以上（システムプロンプトの180-240文字指定に基づく）
  if (poem.length < 120) {
    return { passed: false, reason: '文字数不足（120文字未満）', poem };
  }

  // ルール2: 単語の過度な繰り返し（日本語特有の問題）
  const wordCounts = {
    '静謐': (poem.match(/静謐/g) || []).length,
    '洗練': (poem.match(/洗練/g) || []).length,
    '佇まい': (poem.match(/佇まい/g) || []).length,
  };

  for (const [word, count] of Object.entries(wordCounts)) {
    if (count >= 2) {
      return { passed: false, reason: `単語繰り返し過多（${word}×${count}）`, poem };
    }
  }

  // ルール3: 句点の数チェック（統合失敗の可能性）
  const sentenceCount = (poem.match(/。/g) || []).length;
  if (sentenceCount < 4) {
    return { passed: false, reason: `句点不足（${sentenceCount}個）`, poem };
  }

  // ルール4: 極端に長すぎる（制御不能パターン）
  if (poem.length > 300) {
    return { passed: false, reason: '文字数超過（300文字以上）', poem };
  }

  return { passed: true, poem, title: parsed.title };
}
```

**分類結果例**:
- JSONパース失敗: 1個（エラーログ記録）
- ルール違反: 2個（即座にrejected確定）
- ルール通過: 5個（次の段階へ）
- **全失敗の場合**: プロンプトごとスキップ、エラーログ記録

#### B. Gemini ペアワイズ比較（第2段階）
ルールベースを通過した応答を**2つずつ比較**させる。

**使用モデル**: `google/gemini-2.5-flash-preview-09-2025`（必須）

**⚠️ 重要**: AIに点数を付けさせるのは高評価に固まるアンチパターン。必ず**AかBどちらが良いか**を強制的に選ばせる。

**ペアワイズ比較プロンプト**:
```
以下は同じプロンプトに対する2つの不動産広告です。どちらが優れているか、必ず「A」または「B」のどちらか一方を選んでください。

【評価基準】
1. 物語としての統合性（単なる要素の羅列ではなく、流れがある）
2. 表現の豊かさと自然さ
3. 繰り返しの少なさ
4. 読み手を引き込む魅力

【プロンプト】
{prompt}

【応答A】
{response_a}

【応答B】
{response_b}

必ず「A」または「B」で回答し、簡潔な理由を述べてください。
JSON形式: {"winner": "A", "reason": "理由"}
```

**比較戦略**: ラウンドロビン（総当たり）方式

**重要**: SFTデータセットの正解は使用しない。全てモデル生成結果同士の比較。

1. **ルール通過応答同士の総当たり比較**
   - 通過数が5個の場合: 5C2 = 10ペア
   - 通過数が4個の場合: 4C2 = 6ペア
   - 通過数が3個の場合: 3C2 = 3ペア
   - 通過数が2個の場合: 2C2 = 1ペア

2. **勝率によるランキング構築**
   - 各応答の勝利数をカウント
   - 勝率でソート（上位 = chosen、下位 = rejected）

**API呼び出し回数（ルール通過数別）**:
- 2個通過: 1回
- 3個通過: 3回
- 4個通過: 6回
- 5個通過: 10回
- 6個通過: 15回
- **平均: 7-8回/プロンプト**（通過数5個の場合は10回）

### 4. DPO組み合わせ生成ロジック

**重要**: 全てモデル生成結果のみ使用。SFTデータセットの正解は含まない。

**1プロンプトあたりの出力数**: 5-10組

#### 勝率ランキングからDPO組を構築

総当たり比較結果から各応答の勝率を算出し、ランキングを構築：

```javascript
// 例: 5個通過、10回比較の結果
const rankings = [
  { id: 'resp_A', wins: 4, losses: 0, winRate: 1.00 },   // 1位
  { id: 'resp_B', wins: 3, losses: 1, winRate: 0.75 },   // 2位
  { id: 'resp_C', wins: 2, losses: 2, winRate: 0.50 },   // 3位
  { id: 'resp_D', wins: 1, losses: 3, winRate: 0.25 },   // 4位
  { id: 'resp_E', wins: 0, losses: 4, winRate: 0.00 },   // 5位
];
```

#### DPO組作成パターン

##### パターン1: 上位 vs 下位（明確な品質差）
```javascript
// 1位 vs 5位
{ prompt: P, chosen: resp_A, rejected: resp_E }

// 1位 vs 4位
{ prompt: P, chosen: resp_A, rejected: resp_D }

// 2位 vs 5位
{ prompt: P, chosen: resp_B, rejected: resp_E }

// 2位 vs 4位
{ prompt: P, chosen: resp_B, rejected: resp_D }
```
→ **4組**（上位2個 × 下位2個）

##### パターン2: 中程度の差（学習の細かさ）
```javascript
// 1位 vs 3位
{ prompt: P, chosen: resp_A, rejected: resp_C }

// 2位 vs 3位
{ prompt: P, chosen: resp_B, rejected: resp_C }

// 3位 vs 4位
{ prompt: P, chosen: resp_C, rejected: resp_D }
```
→ **3組**（隣接ランク組み合わせ）

##### パターン3: ルール違反も活用
```javascript
// ランク1位 vs ルール違反
{ prompt: P, chosen: resp_A, rejected: rule_violation_1 }

// ランク2位 vs ルール違反
{ prompt: P, chosen: resp_B, rejected: rule_violation_2 }
```
→ **n組**（ルール違反数、平均2-3組）

#### 出力量の計算例

**ケース1: 標準的な場合（5個通過、3個違反）**
- パターン1: 4組
- パターン2: 3組
- パターン3: 3組
- **合計: 10組/プロンプト**

**ケース2: 通過少ない場合（3個通過、5個違反）**
- パターン1: 2組（1位・2位 vs 3位）
- パターン2: 1組（1位 vs 2位）
- パターン3: 3組（上位 vs 違反）
- **合計: 6組/プロンプト**

**ケース3: 通過多い場合（6個通過、2個違反）**
- パターン1: 6組（上位3個 × 下位2個）
- パターン2: 4組
- パターン3: 2組
- **合計: 12組/プロンプト**

**平均**: **8-10組/プロンプト**

## 実装スクリプト構成

### scripts/generate_dpo_dataset.js
```
1. プロンプト準備（buildUserPrompt使用、新規ランダム生成）
2. ループ処理（目標プロンプト数まで）:
   a. ローカルLLMで8個の応答生成（各10秒間隔）
      - llama.cpp APIコール（dev-server/localLLM.jsと同様）
      - tool use JSON応答を取得
   b. JSONパース＆ルールベースフィルタリング（8個全て）
      - poemフィールド抽出
      - 日本語120文字以上、400文字以下
      - 繰り返し語チェック、句点数チェック
      - **全失敗の場合**: エラーログ記録してスキップ
   c. Geminiペアワイズ比較（総当たり）:
      - ルール通過応答同士を全組み合わせ比較（nC2回）
      - 各応答の勝率を算出してランキング構築
   d. DPO組作成:
      - パターン1: 上位 vs 下位（4組）
      - パターン2: 隣接ランク（3組）
      - パターン3: 上位 vs ルール違反（2-3組）
   e. JSONL追記保存（10プロンプトごと）
3. 最終統計出力（総組数、スキップ数、API呼び出し数）
4. エラーログ出力（data/dpo/errors.jsonl）
```

### データフロー
```
プロンプト → [8個生成] → JSONパース → ルールチェック → Geminiペアワイズ → ランキング → DPO組 → JSONL
               ↓           ↓           ↓               比較(総当たり)    構築      作成
          10秒冷却    poem抽出    通過5/違反3      (10回API)        勝率算出   9組
                                  全失敗→スキップ   nC2ペア
```

## 必要な環境変数
```env
# Gemini API
GOOGLE_AI_API_KEY=your_api_key_here

# ローカルLLM設定
LOCAL_LLM_MODEL_PATH=/path/to/gpt-oss-20b-mansion-poem-20epoch-mxfp4.gguf
LOCAL_LLM_HOST=http://localhost:8080
```

## 出力ファイル

### メインデータセット
- **ファイル名**: `dpo_dataset_gpt-oss-20b.jsonl`
- **保存先**: `data/dpo/`
- **形式**: JSONL（1行1JSON）
- **内容**:
```json
{
  "prompt": "【選択されたカードペア】\n...\n【タイトル選択候補】\n...",
  "chosen": "高品質な広告本文（poemのみ、120-400文字）",
  "rejected": "低品質な広告本文（poemのみ）"
}
```

### エラーログ
- **ファイル名**: `errors.jsonl`
- **保存先**: `data/dpo/`
- **内容**: 全失敗プロンプトとエラー詳細
```json
{
  "prompt": "...",
  "timestamp": "2025-11-10T12:34:56Z",
  "responses": [
    { "raw": "...", "error": "JSONパース失敗" },
    { "poem": "...", "error": "文字数不足（80文字）" }
  ]
}
```

## 推定実行時間

### 1プロンプトあたりの処理時間
- 8個の応答生成: 8 × (生成10秒 + 冷却10秒) = 160秒
- Geminiペアワイズ比較: 平均10回（5C2） × 5秒 = 50秒
- DPO組作成処理: 5秒
- **小計: 215秒（約3.6分）**

### 総実行時間（成功ケースのみ）
- **500組（55プロンプト）**: 215秒 × 55 = 11825秒 ≈ **3.3時間**
- **1000組（112プロンプト）**: 215秒 × 112 = 24080秒 ≈ **6.7時間**
- **2000組（223プロンプト）**: 215秒 × 223 = 47945秒 ≈ **13.3時間**

### Gemini API呼び出し数
- 1プロンプトあたり: 平均10回（5個通過時の総当たり）
- 55プロンプト: 550回
- 112プロンプト: 1120回
- 223プロンプト: 2230回

### スキップ率の考慮
- 全失敗率: 約5-10%と想定
- 実際の実行時間: 上記 × 1.05-1.10

※バッチ処理で実行、進捗とエラーログは10プロンプトごとに保存

## トレーニング後の期待効果
Unslothによると、RLトレーニングにより：
- より自然な表現の生成
- 繰り返しの減少
- 物語としての統合性向上
- ユーザー好みに沿った出力

## 次のステップ
1. `scripts/generate_dpo_dataset.js` 実装
2. 小規模テスト（5プロンプトで動作確認）
   - JSONパース動作確認
   - ルールベースフィルタ確認
   - Gemini総当たり比較確認
   - DPO組作成ロジック確認
3. 中規模テスト（50プロンプト、約3時間）
   - エラーログ検証
   - スキップ率確認
4. 本番実行（112プロンプト、1000組目標）
5. データセット品質検証
   - chosen/rejected分布確認
   - 文字数分布確認
6. Unslothでのトレーニング準備

## 実装上の注意点

### JSONパース処理
- `dev-server/localLLM.js:329-337` の処理を参考
- ```json ... ``` コードブロック対応
- エスケープ改行（`\n`）の変換必須

### ルールベースの調整可能性
初期実行後、以下を調整可能：
- 文字数閾値（120/300文字）
- 繰り返し語の閾値（2回）
- 句点数の閾値（4個）

### Gemini API制限
- Rate limit考慮（必要に応じてsleep追加）
- JSON応答の安定性確認
- エラーハンドリング（リトライロジック）
