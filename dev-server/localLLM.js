/**
 * ローカル開発用ミドルウェアサーバー
 * llama.cpp サーバー専用（ファインチューニングモデル: gpt-oss-20b-mansion-poem-20epoch-mxfp4.gguf）
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// llama.cpp サーバー設定
const LLAMACPP_SERVER_URL = process.env.LLAMACPP_SERVER_URL || 'http://localhost:8080/v1/chat/completions';
const MODEL_NAME = 'gpt-oss-20b-mansion-poem-20epoch-mxfp4.gguf';

// データファイルの読み込み
const catchphrasesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/catchphrases.json'), 'utf-8')
);

// SQLiteデータベースの初期化
const dbPath = path.join(__dirname, 'dev-logs.db');
const db = new Database(dbPath);

// テーブル作成（本番D1と互換性のあるスキーマ + 開発用追加フィールド）
db.exec(`
  CREATE TABLE IF NOT EXISTS generation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 本番環境と共通
    selected_cards TEXT NOT NULL,
    generated_poem TEXT NOT NULL,
    generation_time_ms INTEGER,
    is_successful BOOLEAN DEFAULT 1,

    -- 開発環境専用（実験データ収集用）
    llm_provider TEXT,
    llm_model TEXT,
    prompt_text TEXT,
    reasoning_text TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at
    ON generation_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_generation_logs_provider
    ON generation_logs(llm_provider);
`);

// 既存のテーブルに reasoning_text カラムがない場合は追加
try {
  db.exec(`ALTER TABLE generation_logs ADD COLUMN reasoning_text TEXT`);
  console.log('📊 Added reasoning_text column to existing table');
} catch (err) {
  // カラムが既に存在する場合はエラーを無視
  if (!err.message.includes('duplicate column name')) {
    console.error('⚠️  Warning: Could not add reasoning_text column:', err.message);
  }
}

console.log(`📊 Database initialized: ${dbPath}`);

/**
 * ログをデータベースに記録
 */
function logToDatabase(data) {
  try {
    const stmt = db.prepare(`
      INSERT INTO generation_logs (
        selected_cards, generated_poem, generation_time_ms, is_successful,
        llm_provider, llm_model, prompt_text, reasoning_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      JSON.stringify(data.selectedCards),
      JSON.stringify(data.generatedPoem),
      data.generationTimeMs,
      data.isSuccessful ? 1 : 0,
      'llamacpp',
      MODEL_NAME,
      data.promptText,
      data.reasoningText || null
    );
  } catch (error) {
    console.error('[DB] Failed to log:', error.message);
  }
}

/**
 * ランダムにキャッチフレーズを選択
 */
function selectRandomCatchphrases(catchphrases, count = 20) {
  const shuffled = [...catchphrases].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * SFT用プロンプトテンプレートの読み込み
 */
const PROMPT_TEMPLATE = fs.readFileSync(path.join(__dirname, '../src/data/prompt_for_dataset.txt'), 'utf-8');

/**
 * Developer Prompt (System Message) を構築
 * prompt_for_dataset.txt からプレースホルダー行を除外したもの
 */
function buildDeveloperPrompt() {
  const lines = PROMPT_TEMPLATE.split('\n');
  const relevantLines = lines.filter(line =>
    !line.includes('{PAIRS_LIST}') &&
    !line.includes('{TITLE_CANDIDATES}')
  );
  return relevantLines.join('\n').trim();
}

/**
 * User Prompt (Data) を構築
 * データセット生成スクリプトと同じ形式
 */
function buildUserPrompt(selectedPairs) {
  const selectedCatchphrases = selectRandomCatchphrases(catchphrasesData);
  const titleCandidates = selectedCatchphrases
    .map((phrase, index) => `${index + 1}. ${phrase}`)
    .join('\n');

  const pairsList = selectedPairs
    .map((pair, index) =>
      `${index + 1}. ${pair.conditionCard.category}: ${pair.conditionCard.condition_text} → ${pair.selectedPoem.poem_text}`
    )
    .join('\n');

  return `【選択されたカードペア】
${pairsList}

【タイトル選択候補】
${titleCandidates}`;
}

/**
 * llama.cpp サーバーへリクエスト送信
 */
async function sendLlamaCppRequest(developerPrompt, userPrompt) {
  const response = await fetch(LLAMACPP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: developerPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'submit_poem_alchemy',
            description: '分析（思考過程）と最終的なJSONを厳密に分離して提出する',
            parameters: {
              type: 'object',
              properties: {
                analysis_text: {
                  type: 'string',
                  description: '詳細な思考プロセス。核心テーマ、本質抽出、統合方針、禁止事項チェックを含む。'
                },
                final_json_string: {
                  type: 'string',
                  description: '最終出力のJSON文字列。{title: "...", poem: "..."}形式。'
                }
              },
              required: ['analysis_text', 'final_json_string']
            }
          }
        }
      ],
      tool_choice: 'required',
      temperature: 1.0,
      top_p: 1.0,
      top_k: 0
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[llama.cpp] API error:', errorText);
    throw new Error(`llama.cpp API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * /api/generate-poem エンドポイント
 */
app.post('/api/generate-poem', async (req, res) => {
  const startTime = Date.now();
  let developerPrompt = '';
  let userPrompt = '';
  let reasoningText = '';
  let title = '';
  let poem = '';

  try {
    const { selectedPairs } = req.body;

    if (!selectedPairs || !Array.isArray(selectedPairs)) {
      return res.status(400).json({ error: 'Invalid request: selectedPairs is required' });
    }

    // プロンプト構築
    developerPrompt = buildDeveloperPrompt();
    userPrompt = buildUserPrompt(selectedPairs);

    console.log('[llama.cpp] Generating poem...');

    // llama.cpp リクエスト送信
    const data = await sendLlamaCppRequest(developerPrompt, userPrompt);

    // レスポンス解析
    const message = data.choices?.[0]?.message;
    if (!message) {
      console.error('[llama.cpp] No message in response:', data);
      throw new Error('レスポンスにメッセージが含まれていません');
    }

    // ツールコールがある場合（LM Studio / 新しいllama.cpp仕様）
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      console.log('[llama.cpp] Processing tool call:', toolCall.function?.name);

      if (toolCall.function) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('[llama.cpp] Parsed tool arguments:', JSON.stringify(args, null, 2));
          reasoningText = args.analysis_text || '';

          if (args.final_json_string) {
            // final_json_string をパース
            const finalJson = JSON.parse(args.final_json_string);
            title = finalJson.title || '';
            poem = finalJson.poem || '';
          } else if (args.title && typeof args.poem === 'string') {
            // モデルが直接 title と poem を返した場合のフォールバック
            console.warn('[llama.cpp] Model returned title/poem directly in arguments');
            title = args.title;
            poem = args.poem;
          } else {
            console.error('[llama.cpp] Invalid tool arguments keys:', Object.keys(args));
            throw new Error('ツール引数に有効なデータ（final_json_string または title/poem）が含まれていません');
          }
        } catch (parseError) {
          console.error('[llama.cpp] Tool arguments parse error:', parseError);
          throw new Error('ツール引数の解析に失敗しました');
        }
      }
    }
    // コンテンツがある場合（フォールバック）
    else if (message.content) {
      // reasoning_content を取得（分析テキスト）
      reasoningText = message.reasoning_content || '';

      const content = message.content;

      try {
        // JSONコードブロックを抽出（```json ... ``` の形式に対応）
        const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
        const jsonText = jsonMatch ? jsonMatch[1] : content;

        const parsed = JSON.parse(jsonText);
        title = parsed.title || '';
        poem = parsed.poem || '';
      } catch (parseError) {
        console.error('[llama.cpp] JSON parse error:', parseError);
        console.error('[llama.cpp] content:', content);
        throw new Error('生成されたJSONの解析に失敗しました');
      }
    } else {
      console.error('[llama.cpp] No content or tool_calls in response:', message);
      throw new Error('レスポンスに有効なコンテンツが含まれていません');
    }

    // エスケープされた改行文字を実際の改行に変換
    poem = poem.replace(/\\n/g, '\n');

    if (!title || !poem) {
      throw new Error('titleまたはpoemが見つかりません');
    }

    const generationTime = Date.now() - startTime;
    console.log(`[llama.cpp] ✓ Generated in ${generationTime}ms`);

    // 成功時のログを記録
    logToDatabase({
      selectedCards: selectedPairs,
      generatedPoem: { title, poem },
      generationTimeMs: generationTime,
      isSuccessful: true,
      promptText: `[SYSTEM]\n${developerPrompt}\n\n[USER]\n${userPrompt}`,
      reasoningText
    });

    res.json({ title, poem });

  } catch (error) {
    const generationTime = Date.now() - startTime;
    console.error(`[llama.cpp] ✗ Error after ${generationTime}ms:`, error.message);

    // 失敗時のログを記録
    logToDatabase({
      selectedCards: req.body.selectedPairs || [],
      generatedPoem: { error: error.message },
      generationTimeMs: generationTime,
      isSuccessful: false,
      promptText: `[SYSTEM]\n${developerPrompt}\n\n[USER]\n${userPrompt}`,
      reasoningText
    });

    res.status(500).json({
      error: error.message || 'ポエムの生成に失敗しました'
    });
  }
});

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'llama.cpp Dev Server' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 llama.cpp Dev Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Configuration:`);
  console.log(`   Model: ${MODEL_NAME}`);
  console.log(`   Server URL: ${LLAMACPP_SERVER_URL}`);

  // ログ記録件数を表示
  const logCount = db.prepare('SELECT COUNT(*) as count FROM generation_logs').get();
  console.log(`\n📊 Database:`);
  console.log(`   Path: ${dbPath}`);
  console.log(`   Logs: ${logCount.count} records`);

  console.log(`\n💡 llama.cpp サーバーを起動してください:`);
  console.log(`   llama.cpp/llama-server -m ${MODEL_NAME} \\`);
  console.log(`     --jinja -ngl 99 --threads -1 --ctx-size 16384 \\`);
  console.log(`     --temp 1.0 --top-p 1.0 --top-k 0 \\`);
  console.log(`     --host 0.0.0.0 --port 8080\n`);
});
