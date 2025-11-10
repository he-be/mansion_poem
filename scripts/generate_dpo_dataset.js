/**
 * DPO用データセット生成スクリプト
 *
 * SFT済みモデル（gpt-oss-20b-mansion-poem-20epoch-mxfp4.gguf）から
 * ペアワイズ比較によるDPO (Direct Preference Optimization) データセットを生成
 *
 * 出力: data/dpo/dpo_dataset_gpt-oss-20b.jsonl
 * エラーログ: data/dpo/errors.jsonl
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const LLAMACPP_SERVER_URL = process.env.LLAMACPP_SERVER_URL || 'http://localhost:8080/v1/chat/completions';
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_MODEL = 'google/gemini-2.5-flash-preview-09-2025';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const TARGET_PROMPT_COUNT = 112; // 1000組達成目標
const RESPONSES_PER_PROMPT = 8; // 1プロンプトあたりの生成数
const COOLING_TIME_MS = 10000; // GPU冷却時間（10秒）
const SAVE_INTERVAL = 10; // 10プロンプトごとに保存

const OUTPUT_DIR = path.join(__dirname, '../data/dpo');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'dpo_dataset_gpt-oss-20b.jsonl');
const ERROR_LOG_FILE = path.join(OUTPUT_DIR, 'errors.jsonl');

// 出力ディレクトリ作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// データ読み込み
const cardsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/cards.json'), 'utf-8')
);
const catchphrasesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/catchphrases.json'), 'utf-8')
);

// システムプロンプト（dev-server/localLLM.jsと同じ）
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../src/data/prompt_for_dataset.txt'),
  'utf-8'
);

// 統計情報
const stats = {
  totalPrompts: 0,
  successPrompts: 0,
  skippedPrompts: 0,
  totalDPOPairs: 0,
  totalGeminiCalls: 0,
  startTime: Date.now(),
};

/**
 * ランダムにカードを選択
 */
function selectRandomCards(cards, count) {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * ランダムにキャッチフレーズを選択
 */
function selectRandomCatchphrases(catchphrases, count = 20) {
  const shuffled = [...catchphrases].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * ユーザープロンプトを構築（generate_ft_dataset.jsと同様）
 */
function buildUserPrompt() {
  // 3-5枚のカードをランダム選択
  const cardCount = 3 + Math.floor(Math.random() * 3); // 3-5枚
  const selectedCards = selectRandomCards(cardsData, cardCount);

  const selectedCatchphrases = selectRandomCatchphrases(catchphrasesData);
  const titleCandidates = selectedCatchphrases
    .map((phrase, index) => `${index + 1}. ${phrase}`)
    .join('\n');

  const pairsList = selectedCards.map((card, index) => {
    const randomPoem = card.poems[Math.floor(Math.random() * card.poems.length)];
    return `${index + 1}. ${card.category}: ${card.condition_text} → ${randomPoem.poem_text}`;
  }).join('\n');

  return `【選択されたカードペア】
${pairsList}

【タイトル選択候補】
${titleCandidates}`;
}

/**
 * llama.cpp サーバーへリクエスト送信
 */
async function callLlamaCpp(userPrompt) {
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
                  description: '詳細な思考プロセス。核心テーマ、本質抽出、統合方針、禁止事項チェックを含む。',
                },
                final_json_string: {
                  type: 'string',
                  description: '最終出力のJSON文字列。{title: "...", poem: "..."}形式。',
                },
              },
              required: ['analysis_text', 'final_json_string'],
            },
          },
        }
      ],
      tool_choice: {
        type: 'function',
        function: {
          name: 'submit_poem_alchemy'
        }
      },
      temperature: 1.0,
      top_p: 1.0,
      top_k: 0
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`llama.cpp API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * JSONパース＆ルールベース評価
 *
 * @param {object} rawResponse - llama.cpp APIからのレスポンス
 * @returns {object} { passed: boolean, reason?: string, poem?: string, title?: string, isParseFailed?: boolean }
 */
function evaluateByRules(rawResponse) {
  // Step 1: JSONパース
  let parsed;
  try {
    const message = rawResponse.choices?.[0]?.message;
    if (!message) {
      return { passed: false, reason: 'レスポンスにメッセージが含まれていません', isParseFailed: true };
    }

    const content = message.content;
    if (!content) {
      return { passed: false, reason: 'レスポンスにcontentが含まれていません', isParseFailed: true };
    }

    // JSONコードブロック抽出（```json ... ``` 対応）
    const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
    const jsonText = jsonMatch ? jsonMatch[1] : content;
    parsed = JSON.parse(jsonText);

    if (!parsed.poem) {
      return { passed: false, reason: 'poemフィールド欠落', isParseFailed: true };
    }
  } catch (error) {
    return { passed: false, reason: `JSONパース失敗: ${error.message}`, isParseFailed: true };
  }

  // Step 2: poem抽出とエスケープ改行変換
  let poem = parsed.poem.replace(/\\n/g, '\n');

  // Step 3: 日本語文字数チェック
  // ルール1: 日本語120文字以上（システムプロンプトの180-240文字指定に基づく）
  if (poem.length < 120) {
    return { passed: false, reason: `文字数不足（${poem.length}文字、120文字未満）`, poem };
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
    return { passed: false, reason: `文字数超過（${poem.length}文字、300文字以上）`, poem };
  }

  return { passed: true, poem, title: parsed.title };
}

/**
 * sleep関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geminiペアワイズ比較
 *
 * @param {string} prompt - ユーザープロンプト
 * @param {string} responseA - 応答A（poem）
 * @param {string} responseB - 応答B（poem）
 * @returns {Promise<string>} - "A" or "B"
 */
async function compareWithGemini(prompt, responseA, responseB) {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not set in .env file');
  }

  const comparisonPrompt = `以下は同じプロンプトに対する2つの不動産広告です。どちらが優れているか、必ず「A」または「B」のどちらか一方を選んでください。

【評価基準】
1. 物語としての統合性（単なる要素の羅列ではなく、流れがある）
2. 表現の豊かさと自然さ
3. 繰り返しの少なさ
4. 読み手を引き込む魅力

【プロンプト】
${prompt}

【応答A】
${responseA}

【応答B】
${responseB}

必ず「A」または「B」で回答し、簡潔な理由を述べてください。
JSON形式: {"winner": "A", "reason": "理由"}`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GOOGLE_AI_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/yourusername/mansion_poem',
      'X-Title': 'DPO Dataset Generator - Pairwise Comparison',
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: [
        { role: 'user', content: comparisonPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Gemini応答にcontentが含まれていません');
  }

  // JSON抽出
  const jsonMatch = content.match(/\{[\s\S]*"winner"[\s\S]*\}/);
  if (!jsonMatch) {
    // フォールバック: AまたはBを直接探す
    if (content.includes('"A"') || content.includes('「A」')) {
      return 'A';
    } else if (content.includes('"B"') || content.includes('「B」')) {
      return 'B';
    }
    throw new Error(`Gemini応答からwinnerを抽出できません: ${content}`);
  }

  const result = JSON.parse(jsonMatch[0]);
  return result.winner;
}

/**
 * 総当たりペアワイズ比較とランキング構築
 *
 * @param {string} prompt - ユーザープロンプト
 * @param {Array} passedResponses - ルール通過応答 [{poem, title}, ...]
 * @returns {Promise<Array>} - ランキング済み応答 [{poem, title, wins, losses, winRate}, ...]
 */
async function buildRankingByPairwise(prompt, passedResponses) {
  const n = passedResponses.length;

  if (n < 2) {
    // 2個未満の場合はランキング不要
    return passedResponses.map(resp => ({
      ...resp,
      wins: 0,
      losses: 0,
      winRate: 0
    }));
  }

  // 勝敗カウント初期化
  const winCounts = new Array(n).fill(0);
  const lossCounts = new Array(n).fill(0);

  // 総当たり比較（nC2ペア）
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      console.log(`  [Gemini比較] ${i+1} vs ${j+1}`);

      const winner = await compareWithGemini(
        prompt,
        passedResponses[i].poem,
        passedResponses[j].poem
      );

      stats.totalGeminiCalls++;

      if (winner === 'A') {
        winCounts[i]++;
        lossCounts[j]++;
      } else {
        winCounts[j]++;
        lossCounts[i]++;
      }

      // Rate limit対策（1秒待機）
      await sleep(1000);
    }
  }

  // ランキング構築
  const ranked = passedResponses.map((resp, index) => ({
    ...resp,
    wins: winCounts[index],
    losses: lossCounts[index],
    winRate: winCounts[index] / (winCounts[index] + lossCounts[index])
  }));

  // 勝率でソート（降順）
  ranked.sort((a, b) => b.winRate - a.winRate);

  return ranked;
}

/**
 * DPO組作成
 *
 * @param {string} prompt - ユーザープロンプト
 * @param {Array} ranked - ランキング済み応答
 * @param {Array} violations - ルール違反応答 [{poem, reason}, ...]
 * @returns {Array} - DPO組 [{prompt, chosen, rejected}, ...]
 */
function createDPOPairs(prompt, ranked, violations) {
  const pairs = [];

  // パターン1: 上位 vs 下位（明確な品質差）
  if (ranked.length >= 4) {
    const top2 = ranked.slice(0, 2);
    const bottom2 = ranked.slice(-2).reverse(); // 下位2個を逆順

    for (const topResp of top2) {
      for (const bottomResp of bottom2) {
        pairs.push({
          prompt,
          chosen: topResp.poem,
          rejected: bottomResp.poem
        });
      }
    }
  } else if (ranked.length >= 2) {
    // 2-3個の場合: 上位1個 vs 下位全て
    const top = ranked[0];
    for (let i = 1; i < ranked.length; i++) {
      pairs.push({
        prompt,
        chosen: top.poem,
        rejected: ranked[i].poem
      });
    }
  }

  // パターン2: 中程度の差（隣接ランク）
  if (ranked.length >= 3) {
    for (let i = 0; i < ranked.length - 1; i++) {
      pairs.push({
        prompt,
        chosen: ranked[i].poem,
        rejected: ranked[i + 1].poem
      });
    }
  }

  // パターン3: 上位 vs ルール違反
  if (violations.length > 0 && ranked.length > 0) {
    const topResponses = ranked.slice(0, Math.min(2, ranked.length));
    const violationsToUse = violations.slice(0, Math.min(3, violations.length));

    for (const topResp of topResponses) {
      for (const violation of violationsToUse) {
        pairs.push({
          prompt,
          chosen: topResp.poem,
          rejected: violation.poem
        });
      }
    }
  }

  return pairs;
}

/**
 * エラーログ保存
 */
function saveErrorLog(prompt, responses) {
  const errorLog = {
    prompt,
    timestamp: new Date().toISOString(),
    responses
  };

  fs.appendFileSync(ERROR_LOG_FILE, JSON.stringify(errorLog) + '\n', 'utf-8');
}

/**
 * DPO組を保存
 */
function saveDPOPairs(pairs) {
  for (const pair of pairs) {
    fs.appendFileSync(OUTPUT_FILE, JSON.stringify(pair) + '\n', 'utf-8');
  }
}

/**
 * 統計情報を表示
 */
function printStats() {
  const elapsedSec = (Date.now() - stats.startTime) / 1000;
  const elapsedMin = elapsedSec / 60;

  console.log('\n========== 統計情報 ==========');
  console.log(`総プロンプト数: ${stats.totalPrompts}`);
  console.log(`成功プロンプト数: ${stats.successPrompts}`);
  console.log(`スキッププロンプト数: ${stats.skippedPrompts}`);
  console.log(`総DPO組数: ${stats.totalDPOPairs}`);
  console.log(`総Gemini API呼び出し数: ${stats.totalGeminiCalls}`);
  console.log(`平均DPO組/プロンプト: ${(stats.totalDPOPairs / stats.successPrompts).toFixed(1)}`);
  console.log(`経過時間: ${elapsedMin.toFixed(1)}分 (${elapsedSec.toFixed(0)}秒)`);
  console.log('==============================\n');
}

/**
 * メイン処理
 */
async function main() {
  console.log('========== DPOデータセット生成開始 ==========');
  console.log(`目標プロンプト数: ${TARGET_PROMPT_COUNT}`);
  console.log(`1プロンプトあたり生成数: ${RESPONSES_PER_PROMPT}`);
  console.log(`冷却時間: ${COOLING_TIME_MS}ms`);
  console.log(`出力ファイル: ${OUTPUT_FILE}`);
  console.log(`エラーログ: ${ERROR_LOG_FILE}`);
  console.log('==========================================\n');

  for (let promptIndex = 0; promptIndex < TARGET_PROMPT_COUNT; promptIndex++) {
    stats.totalPrompts++;
    console.log(`\n[${promptIndex + 1}/${TARGET_PROMPT_COUNT}] プロンプト生成中...`);

    // プロンプト準備
    const prompt = buildUserPrompt();
    console.log(`プロンプト長: ${prompt.length}文字`);

    // 8個の応答生成
    const rawResponses = [];
    console.log(`\n[応答生成] ${RESPONSES_PER_PROMPT}個生成中...`);

    for (let i = 0; i < RESPONSES_PER_PROMPT; i++) {
      try {
        console.log(`  生成 ${i + 1}/${RESPONSES_PER_PROMPT}...`);
        const response = await callLlamaCpp(prompt);
        rawResponses.push(response);

        // 冷却時間（最後の生成後は不要）
        if (i < RESPONSES_PER_PROMPT - 1) {
          await sleep(COOLING_TIME_MS);
        }
      } catch (error) {
        console.error(`  ✗ 生成失敗: ${error.message}`);
        rawResponses.push({ error: error.message });
      }
    }

    // JSONパース＆ルールベース評価
    console.log(`\n[ルールベース評価] ${rawResponses.length}個評価中...`);
    const passedResponses = [];
    const violations = [];
    const parseFailures = [];

    for (let i = 0; i < rawResponses.length; i++) {
      if (rawResponses[i].error) {
        parseFailures.push({ error: rawResponses[i].error });
        console.log(`  ${i + 1}. ✗ 生成エラー`);
        continue;
      }

      const result = evaluateByRules(rawResponses[i]);

      if (result.passed) {
        passedResponses.push({ poem: result.poem, title: result.title });
        console.log(`  ${i + 1}. ✓ 通過 (${result.poem.length}文字)`);
      } else {
        if (result.isParseFailed) {
          parseFailures.push({ error: result.reason });
          console.log(`  ${i + 1}. ✗ ${result.reason}`);
        } else {
          violations.push({ poem: result.poem, reason: result.reason });
          console.log(`  ${i + 1}. ✗ ${result.reason}`);
        }
      }
    }

    console.log(`\n結果: 通過=${passedResponses.length}, 違反=${violations.length}, パース失敗=${parseFailures.length}`);

    // 全失敗の場合はスキップ
    if (passedResponses.length === 0) {
      console.log('⚠️  全失敗のためスキップ');
      stats.skippedPrompts++;

      saveErrorLog(prompt, [
        ...violations.map(v => ({ poem: v.poem, error: v.reason })),
        ...parseFailures
      ]);

      continue;
    }

    // Geminiペアワイズ比較＆ランキング構築
    console.log(`\n[Geminiペアワイズ比較] ${passedResponses.length}個の総当たり比較...`);
    const ranked = await buildRankingByPairwise(prompt, passedResponses);

    console.log('\nランキング:');
    ranked.forEach((resp, i) => {
      console.log(`  ${i + 1}位: 勝率${(resp.winRate * 100).toFixed(0)}% (${resp.wins}勝${resp.losses}敗)`);
    });

    // DPO組作成
    const dpoPairs = createDPOPairs(prompt, ranked, violations);
    console.log(`\n[DPO組作成] ${dpoPairs.length}組作成`);

    // 保存
    saveDPOPairs(dpoPairs);
    stats.totalDPOPairs += dpoPairs.length;
    stats.successPrompts++;

    // 定期的に統計表示
    if ((promptIndex + 1) % SAVE_INTERVAL === 0) {
      printStats();
    }
  }

  // 最終統計
  printStats();
  console.log('✓ DPOデータセット生成完了');
}

// 実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
