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

import os from 'os';

// ... (existing imports)

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 環境設定
const MODEL_NAME = 'gpt-oss-20b-mansion-poem';

// 実行環境の判定と設定
function getEnvConfig() {
  const env = process.env.LLM_ENV || (os.platform() === 'darwin' ? 'mac' : 'cuda');

  const configs = {
    mac: {
      name: 'MacBook (Metal/MPS)',
      serverUrl: process.env.LLAMACPP_SERVER_URL || 'http://100.121.61.11:8080/v1/chat/completions',
      launchCommand: `llama.cpp/llama-server -m ${MODEL_NAME} \\\n     --jinja -ngl 99 --threads -1 --ctx-size 16384 \\\n     --temp 1.0 --top-p 1.0 --top-k 0 \\\n     --host 0.0.0.0 --port 8080`
    },
    cuda: {
      name: 'CUDA (Linux/Windows)',
      // 【重要】オフライン展示用設定: ここでLLMサーバーのURLを指定します
      // 外部サーバー（例: 別PC）を使う場合はそのIPアドレスを指定してください
      serverUrl: process.env.LLAMACPP_SERVER_URL || 'http://127.0.0.1:8080/v1/chat/completions',
      launchCommand: `llama.cpp/llama-server -m ${MODEL_NAME} \\\n     --jinja -ngl 99 --threads -1 --ctx-size 16384 \\\n     --temp 1.0 --top-p 1.0 --top-k 0 \\\n     --host 0.0.0.0 -dev CUDA1 --port 8080`
    }
  };

  return {
    env,
    ...configs[env] || configs.cuda // デフォルトはCUDA（安全側）
  };
}

const config = getEnvConfig();
const LLAMACPP_SERVER_URL = config.serverUrl;

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
 * システムプロンプト（plan_1028.txt から）
 */
const SYSTEM_PROMPT = `あなたは一流不動産広告のクリエイティブディレクターです。
選択されたポエムカードの本質を抽出し、それらが一つの流れる物語として昇華された、心に響く広告本文とタイトルを創造してください。

【重要】あなたのタスクは、各カードの詩句を組み合わせることではありません。それらを一度完全に分解し、魂だけを抜き出して、全く新しい物語として**「再創造」**することです。

【統合の指針】
1.  **核心テーマの特定**: 全カードに通底する「物件の魂」を一言で定義します。（例：都市の喧騒から切り離された、天空の聖域）
2.  **物語の再構築**: そのテーマを軸に、各要素が必然的に結びつくよう、一つの物語を構築します。
    * 対比構造の活用（例：地上の躍動 vs 天空の静謐）
    * 空間軸での統合（例：街の風景 → 邸宅の佇まい → 住空間の哲学）
3.  **【絶対的禁止事項】元の素材の完全な隠蔽**:
    * **元の条件カードのネガティブな事実（例：「線路沿い」「管理人不在」「崖」）を、生成文中で直接的・間接的に言及、あるいは容易に推測させてはなりません。**
    * 錬金術の目的は、元の素材の痕跡を完全に消し去り、輝く価値だけを残すことです。

【文章構造】3-4段落、**180-240文字**

 第1段落：世界観の提示（約60字）
  → 立地や環境が持つ本質的な空気を描写
  → 読者を物語へ引き込む導入

 第2-3段落：体験価値の展開（約120字）
  → 選択されたポエムの「魂」をここで統合
  → 対比や時間の流れで自然に繋ぐ

 最終段落：所有の意味の昇華（約60字）
  → 「ここに住まう」という価値の提示
  → 余韻を残す、哲学的な締めくくり


【文体の原則】
✓ 短文を「。」で区切る、断定的でリズムの良い文体
✓ 体言止めと通常文を適度に混在させる（体言止めは多すぎない）
✓ 主語を省略し、場所や住まいを主語として描写する
✓ 読点「、」を戦略的に配置し、リズムと余韻を生む

【必須の統合技法】
× 悪い例：「A。B。C。」（単純な並列）
○ 良い例：「Aという世界観が、Bという体験価値を生み、Cという日常へと昇華する」

【語彙選択】
推奨語：静謐、佇まい、緑陰、洗練、風雅、刻（とき）、邸、澄む
対比語：賑わいと静けさ、都心と緑、活気と安らぎ
禁止語：最高、一番、絶対、完璧、完全（不動産広告規制）

【避けるべき表現】
× 「○○です」「○○でしょう」等の丁寧語・推量
× 「あなた」「貴方」の直接的呼びかけ
× **元のネガティブな条件を匂わせる言葉（例：「騒音」「距離」「坂道」）**
× 選ばれたポエムカードの単語や言い回しのコピー＆ペースト

【あなたへの具体的指示】
1.  まず、選ばれたカード全体が持つ「魂」を一行で要約します。
2.  その魂を中心に、各要素が自然に溶け込む物語を構築します。
3.  **元の条件は完全に忘れ、ポエムの「意味」だけを素材としてください。**

【最終チェック】
□ 選ばれたカードが単に並んでいるだけになっていないか
□ 全体で一つの統一されたテーマを持っているか
□ **元のネガティブな条件が、読者に推測されないか**
□ 読んで余韻が残るか

【出力方式】
あなたは必ず \`submit_poem_alchemy\` ツールを呼び出して回答してください。

このツールには以下の2つのパラメータを渡します：

1. **analysis_text**: あなたの思考過程を日本語で詳細に記述
   - 核心テーマの特定（全カードに通底する物件の魂）
   - 各カードの本質抽出（詩的エッセンスとネガティブ事実からの転換）
   - 統合方針（物語構造、対比設計、選択タイトルとの整合性）
   - 禁止事項チェック（元の条件を匂わせる表現、文字数制約の確認）

2. **final_json_string**: 最終的なJSON出力（文字列として）
\`\`\`json
{
  "title": "選択したキャッチコピーをそのまま記載",
  "poem": "生成した広告本文"
}
\`\`\`

**重要**:
- titleは【タイトル選択候補】から選んだものを**一字一句そのまま**記載
- poemは生成した広告本文のみ（説明不要）
- 必ず \`submit_poem_alchemy\` ツールを使用すること（他の出力形式は不可）`;

/**
 * ユーザープロンプトを構築
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
async function sendLlamaCppRequest(userPrompt) {
  const response = await fetch(LLAMACPP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
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
      tool_choice: 'auto',
      temperature: 0.6,
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
  let userPrompt = '';
  let fullReasoning = '';
  let fullContent = '';

  // バッファリング用
  let responseBuffer = '';

  try {
    const { selectedPairs, stream } = req.body;

    if (!selectedPairs || !Array.isArray(selectedPairs)) {
      return res.status(400).json({ error: 'Invalid request: selectedPairs is required' });
    }

    // プロンプト構築
    userPrompt = buildUserPrompt(selectedPairs);

    console.log('[llama.cpp] Generating poem (Streaming)...');

    // llama.cpp へストリーミングリクエスト送信
    const llamaResponse = await fetch(LLAMACPP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
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
                  analysis_text: { type: 'string' },
                  final_json_string: { type: 'string' }
                },
                required: ['analysis_text', 'final_json_string']
              }
            }
          }
        ],
        tool_choice: 'auto',
        temperature: 0.6,
        top_p: 1.0,
        top_k: 0,
        stream: true // 常にストリーミング有効化
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('[llama.cpp] API error:', errorText);
      throw new Error(`llama.cpp API error: ${llamaResponse.status}`);
    }

    const contentType = llamaResponse.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const html = await llamaResponse.text();
      console.error('[llama.cpp] Received HTML response:', html.substring(0, 500));
      throw new Error(`llama.cpp returned HTML response (status ${llamaResponse.status})`);
    }

    // クライアントへのレスポンスヘッダー設定（SSE）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Web Streams API (Node.js 18+)
    const reader = llamaResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      responseBuffer += chunk;

      // クライアントへそのまま転送
      res.write(chunk);

      // サーバー側でログ用に解析するために行ごとに処理
      // 注: ここで完全な解析をするのは複雑になるため、
      // 簡易的に蓄積し、ストリーム終了後に全体をパースする戦略をとるが、
      // バッファが切れたJSONをパースしないように注意が必要。
      // ここでは詳細解析はせず、最後にresponseBuffer全体を処理する形にする。
    }

    res.end();

    // --- ストリーム終了後の後処理（DBログ記録） ---

    // responseBufferから全SSEイベントを抽出して結合
    const lines = responseBuffer.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
        try {
          const jsonStr = line.replace(/^data: /, '').trim();
          if (!jsonStr) continue;

          const data = JSON.parse(jsonStr);
          const delta = data.choices?.[0]?.delta;

          if (delta) {
            if (delta.reasoning) fullReasoning += delta.reasoning;
            if (delta.content) fullContent += delta.content;
            // tool_callsの場合もcontentなどに含まれるか、別フィールド
            if (delta.tool_calls) {
              // tool_callsのストリーミングは複雑だが、ここではcontentに簡略化して扱うか、
              // あるいは通常のcontentとして出てくるのを待つ。
              // llama.cppのtool_callストリーミングの挙動に依存。
              // 多くの場合contentに出るか、tool_calls配列で来る。
              // いったんcontentとして扱う
              // 実装確認したdemo出力では reasoning と content が出ていた。
            }
          }
        } catch (e) {
          // JSONパースエラーは無視（断片の可能性あり）
        }
      }
    }

    // 最終的なJSONの抽出（既存ロジック再利用）
    let title = '';
    let poem = '';
    let isSuccessful = false;
    let errorMsg = null;

    try {
      let jsonText = fullContent;

      // パターンマッチング（既存ロジック）
      // パターンマッチング（既存ロジック）
      const channelMatch1 = fullContent.match(/<\|channel\|>final_json_string[^{]*?(\{[\s\S]*?\})\s*$/);
      const channelMatch2 = fullContent.match(/<\|channel\|>final_json_string[^<]*<\|message\|>([\s\S]*?)(?:<\|channel\||$)/);
      const channelStringMatch = fullContent.match(/<\|channel\|>final_json_string\s*("[\s\S]*?")/);
      const jsonMatch = fullContent.match(/```json\s*\n?([\s\S]*?)\n?```/);
      const broadMatch = fullContent.match(/(\{[\s\S]*?"final_json_string"[\s\S]*\})(?:\s*\)|;)*$/) || fullContent.match(/(\{[\s\S]*?"final_json_string"[\s\S]*?\})/);

      if (broadMatch) {
        jsonText = broadMatch[1];
      } else if (channelStringMatch) {
        jsonText = channelStringMatch[1];
        jsonText = jsonText.replace(/\r?\n/g, '\\n');
      } else if (channelMatch1) {
        jsonText = channelMatch1[1].trim();
      } else if (channelMatch2) {
        jsonText = channelMatch2[1].trim();
      } else if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      // コメント削除 (// ...)
      jsonText = jsonText.replace(/\/\/.*$/gm, '');

      // JSONとしてパース試行
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        // ignore
      }

      // JSON文字列としてパースされた場合（二重エンコード対策）
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          // ignore
        }
      }

      // final_json_string がJSON文字列の場合の展開
      if (parsed && parsed.final_json_string && typeof parsed.final_json_string === 'string') {
        try {
          parsed = JSON.parse(parsed.final_json_string);
        } catch (e2) {
          // ignore
        }
      }

      // [Fallback] Direct Property Extraction
      if (!parsed || !parsed.title || !parsed.poem) {
        const titleMatch = fullContent.match(/"title"\s*:\s*("(?:\\[\s\S]|[^"\\])*")/);
        const poemMatch = fullContent.match(/"poem"\s*:\s*("(?:\\[\s\S]|[^"\\])*")/);

        if (titleMatch && poemMatch) {
          try {
            parsed = parsed || {};
            parsed.title = JSON.parse(titleMatch[1]);
            parsed.poem = JSON.parse(poemMatch[1]);
          } catch (e) {
            // ignore
          }
        }
      }

      title = (parsed && parsed.title) || '';
      poem = (parsed && parsed.poem) || '';
      poem = poem.replace(/\\n/g, '\n');

      if (title && poem) isSuccessful = true;

    } catch (e) {
      errorMsg = e.message;
    }

    const generationTime = Date.now() - startTime;
    console.log(`[llama.cpp] Stream finished in ${generationTime}ms. Success: ${isSuccessful}`);

    logToDatabase({
      selectedCards: selectedPairs,
      generatedPoem: isSuccessful ? { title, poem } : { error: errorMsg || 'Parse failed' },
      generationTimeMs: generationTime,
      isSuccessful,
      promptText: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      reasoningText: fullReasoning
    });

  } catch (error) {
    const generationTime = Date.now() - startTime;
    console.error(`[llama.cpp] Stream Error:`, error.message);

    // ストリーム途中でのエラーはどうしようもないが、レスポンスがまだ終わってなければエラーを送る
    // しかしヘッダー送信済みの場合はres.writeでエラーイベントを送る等の工夫が必要
    // ここではログだけ残す
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end(); // 強制終了
    }

    logToDatabase({
      selectedCards: req.body.selectedPairs || [],
      generatedPoem: { error: error.message },
      generationTimeMs: generationTime,
      isSuccessful: false,
      promptText: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      reasoningText: fullReasoning || null
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
  console.log(`   Environment: ${config.name} (${process.env.LLM_ENV ? 'Manual Override' : 'Auto-detected'})`);
  console.log(`   Model: ${MODEL_NAME}`);
  console.log(`   Server URL: ${LLAMACPP_SERVER_URL}`);

  // ログ記録件数を表示
  const logCount = db.prepare('SELECT COUNT(*) as count FROM generation_logs').get();
  console.log(`\n📊 Database:`);
  console.log(`   Path: ${dbPath}`);
  console.log(`   Logs: ${logCount.count} records`);

  console.log(`\n💡 llama.cpp サーバーを起動してください:`);
  console.log(`   ${config.launchCommand}\n`);
});
