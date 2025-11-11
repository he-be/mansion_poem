/**
 * DPO用応答収集スクリプト
 *
 * SFT済みモデル（gpt-oss-20b-mansion-poem-20epoch-mxfp4.gguf）から
 * 複数の応答を生成し、ルールベースフィルタリングして保存
 *
 * 出力: data/dpo/raw_responses.jsonl
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

const TARGET_PROMPT_COUNT = 5; // テスト用（本番: 112）
const RESPONSES_PER_PROMPT = 8; // 1プロンプトあたりの生成数
const COOLING_TIME_MS = 10000; // GPU冷却時間（10秒）
const SAVE_INTERVAL = 10; // 10プロンプトごとに保存

const OUTPUT_DIR = path.join(__dirname, '../data/dpo');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'raw_responses.jsonl');
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
  totalResponses: 0,
  passedResponses: 0,
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
    '研ぎ澄ま': (poem.match(/研ぎ澄ま/g) || []).length,
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

  // Step 4: 品質スコアリング（100点満点）
  let qualityScore = 100;
  const scoreDetails = [];

  // 1. 抽象語の過密度チェック（-15点×出現回数）
  const abstractWords = {
    '哲学': 0,
    '美学': 0,
    '思想': 0,
    '佇まい': 0,
    '刻': 0, // 「刻」と「刻（とき）」を合計
    '躍動': 0,
    '風雅': 0
  };

  // 抽象語をカウント（「刻」は「刻（とき）」も含む）
  abstractWords['哲学'] = (poem.match(/哲学/g) || []).length;
  abstractWords['美学'] = (poem.match(/美学/g) || []).length;
  abstractWords['思想'] = (poem.match(/思想/g) || []).length;
  abstractWords['佇まい'] = (poem.match(/佇まい/g) || []).length;
  abstractWords['刻'] = (poem.match(/刻（とき）|刻(?!（とき）)/g) || []).length;
  abstractWords['躍動'] = (poem.match(/躍動/g) || []).length;
  abstractWords['風雅'] = (poem.match(/風雅/g) || []).length;

  const abstractCount = Object.values(abstractWords).reduce((a, b) => a + b, 0);

  if (abstractCount > 0) {
    const penalty = abstractCount * 15;
    qualityScore -= penalty;
    scoreDetails.push(`抽象語過多(-${penalty}点, ${abstractCount}個)`);
  }

  // 2. 同一語彙の過度な繰り返し（-20点）
  const commonWords = ['場所', '都市', '住まい', '空間'];
  for (const word of commonWords) {
    const count = (poem.match(new RegExp(word, 'g')) || []).length;
    if (count >= 2) {
      qualityScore -= 20;
      scoreDetails.push(`語彙繰り返し(-20点, ${word}×${count})`);
    }
  }

  // 3. 具体的自然描写の有無（+20点）
  const natureWords = ['光', '緑', '緑陰', '水', '風', '空', '四季', '季節', '樹', '雲', '大地', '山'];
  const hasNature = natureWords.some(word => poem.includes(word));
  if (hasNature) {
    qualityScore += 20;
    scoreDetails.push('自然描写(+20点)');
  }

  // 4. 感情語の有無（+15点）
  const emotionWords = ['安らぎ', '満たされ', '優しさ', '安堵', '充足', '喜び', '心地'];
  const hasEmotion = emotionWords.some(word => poem.includes(word));
  if (hasEmotion) {
    qualityScore += 15;
    scoreDetails.push('感情語(+15点)');
  }

  // 5. 段落構造（-20点：1段落のみ＆150文字以上）
  const paragraphs = poem.split('\n\n').filter(p => p.trim());
  if (paragraphs.length === 1 && poem.length >= 150) {
    qualityScore -= 20;
    scoreDetails.push('段落構造不良(-20点)');
  }

  // 6. 文長の多様性（+10点：標準偏差が10以上）
  const sentences = poem.split('。').filter(s => s.trim());
  if (sentences.length > 1) {
    const lengths = sentences.map(s => s.trim().length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev >= 10) {
      qualityScore += 10;
      scoreDetails.push('文長多様性(+10点)');
    }
  }

  // 7. 体言止めの過度な使用（-10点：2回以上）
  const taiGenPatterns = [
    /として。/g,
    /のため。/g,
    /の場所。/g,
    /の領域。/g,
    /の刻。/g,
    /のこと。/g
  ];
  let taiGenCount = 0;
  for (const pattern of taiGenPatterns) {
    taiGenCount += (poem.match(pattern) || []).length;
  }
  if (taiGenCount >= 2) {
    qualityScore -= 10;
    scoreDetails.push(`体言止め過多(-10点, ${taiGenCount}回)`);
  }

  // 8. 「哲学」の過度な使用（-25点：2回以上）
  const philosophyCount = (poem.match(/哲学/g) || []).length;
  if (philosophyCount >= 2) {
    qualityScore -= 25;
    scoreDetails.push(`哲学過多(-25点, ${philosophyCount}回)`);
  }

  // 9. 短文の戦略的使用（+10点：15文字以下の文が1つ以上）
  const hasShortSentence = sentences.some(s => s.trim().length <= 15 && s.trim().length > 0);
  if (hasShortSentence) {
    qualityScore += 10;
    scoreDetails.push('短文使用(+10点)');
  }

  // 品質スコア判定（閾値: 80点）
  if (qualityScore < 80) {
    return {
      passed: false,
      reason: `品質スコア不足（${qualityScore}点、80点未満）: ${scoreDetails.join(', ')}`,
      poem,
      quality_score: qualityScore
    };
  }

  return { passed: true, poem, title: parsed.title, quality_score: qualityScore };
}

/**
 * sleep関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * エラーログ保存
 */
function saveErrorLog(promptId, prompt, responses) {
  const errorLog = {
    prompt_id: promptId,
    prompt,
    timestamp: new Date().toISOString(),
    responses
  };

  fs.appendFileSync(ERROR_LOG_FILE, JSON.stringify(errorLog) + '\n', 'utf-8');
}

/**
 * 応答グループを保存
 */
function saveResponseGroup(promptId, prompt, responses) {
  const responseGroup = {
    prompt_id: promptId,
    prompt,
    responses
  };

  fs.appendFileSync(OUTPUT_FILE, JSON.stringify(responseGroup) + '\n', 'utf-8');
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
  console.log(`総応答数: ${stats.totalResponses}`);
  console.log(`通過応答数: ${stats.passedResponses}`);
  console.log(`通過率: ${((stats.passedResponses / stats.totalResponses) * 100).toFixed(1)}%`);
  console.log(`平均通過数/プロンプト: ${(stats.passedResponses / stats.successPrompts).toFixed(1)}`);
  console.log(`経過時間: ${elapsedMin.toFixed(1)}分 (${elapsedSec.toFixed(0)}秒)`);
  console.log('==============================\n');
}

/**
 * メイン処理
 */
async function main() {
  console.log('========== 応答収集開始 ==========');
  console.log(`目標プロンプト数: ${TARGET_PROMPT_COUNT}`);
  console.log(`1プロンプトあたり生成数: ${RESPONSES_PER_PROMPT}`);
  console.log(`冷却時間: ${COOLING_TIME_MS}ms`);
  console.log(`出力ファイル: ${OUTPUT_FILE}`);
  console.log(`エラーログ: ${ERROR_LOG_FILE}`);
  console.log('==========================================\n');

  for (let promptIndex = 0; promptIndex < TARGET_PROMPT_COUNT; promptIndex++) {
    stats.totalPrompts++;
    const promptId = `prompt_${promptIndex + 1}`;
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
        stats.totalResponses++;

        // 冷却時間（最後の生成後は不要）
        if (i < RESPONSES_PER_PROMPT - 1) {
          await sleep(COOLING_TIME_MS);
        }
      } catch (error) {
        console.error(`  ✗ 生成失敗: ${error.message}`);
        rawResponses.push({ error: error.message });
        stats.totalResponses++;
      }
    }

    // JSONパース＆ルールベース評価
    console.log(`\n[ルールベース評価] ${rawResponses.length}個評価中...`);
    const responses = [];

    for (let i = 0; i < rawResponses.length; i++) {
      if (rawResponses[i].error) {
        responses.push({
          response_id: i + 1,
          passed: false,
          error: rawResponses[i].error
        });
        console.log(`  ${i + 1}. ✗ 生成エラー`);
        continue;
      }

      const result = evaluateByRules(rawResponses[i]);

      if (result.passed) {
        responses.push({
          response_id: i + 1,
          passed: true,
          poem: result.poem,
          title: result.title,
          quality_score: result.quality_score
        });
        stats.passedResponses++;
        console.log(`  ${i + 1}. ✓ 通過 (${result.poem.length}文字, スコア${result.quality_score}点)`);
      } else {
        responses.push({
          response_id: i + 1,
          passed: false,
          reason: result.reason,
          poem: result.poem || null,
          quality_score: result.quality_score || null
        });
        console.log(`  ${i + 1}. ✗ ${result.reason}`);
      }
    }

    const passedCount = responses.filter(r => r.passed).length;
    const failedCount = responses.length - passedCount;
    console.log(`\n結果: 通過=${passedCount}, 不合格=${failedCount}`);

    // 応答グループを保存
    saveResponseGroup(promptId, prompt, responses);
    stats.successPrompts++;

    // 定期的に統計表示
    if ((promptIndex + 1) % SAVE_INTERVAL === 0) {
      printStats();
    }
  }

  // 最終統計
  printStats();
  console.log('✓ 応答収集完了');
}

// 実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
