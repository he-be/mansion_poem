/**
 * ファインチューニング用データセット生成スクリプト
 * HuggingFace H4/Multilingual-Thinking形式（Harmony応答フォーマット）
 *
 * モデル: google/gemini-2.5-flash-preview-09-2025 (OpenRouter経由)
 * 出力: datasets/mansion_poem_ft.jsonl
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'google/gemini-2.5-flash-preview-09-2025';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SAMPLE_COUNT = 2000; // 生成するサンプル数
const OUTPUT_FILE = path.join(__dirname, '../datasets/mansion_poem_ft_gemini1.jsonl');

// データ読み込み
const cardsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/cards.json'), 'utf-8')
);
const catchphrasesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/catchphrases.json'), 'utf-8')
);
const promptTemplate = fs.readFileSync(
  path.join(__dirname, '../src/data/prompt_for_dataset.txt'),
  'utf-8'
);

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
function selectRandomCatchphrases(catchphrases, count) {
  const shuffled = [...catchphrases].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Tool定義: submit_poem_alchemy
 * 分析（思考過程）と最終JSONを構造化して取得
 */
const TOOLS = [
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
  },
];

/**
 * developer roleのコンテンツを構築（システムプロンプト）
 */
function buildDeveloperPrompt() {
  // prompt.txt全体をdeveloper promptとして使用（テンプレート変数を除く）
  const lines = promptTemplate.split('\n');
  const relevantLines = lines.filter(line =>
    !line.includes('{PAIRS_LIST}') &&
    !line.includes('{TITLE_CANDIDATES}')
  );
  return relevantLines.join('\n').trim();
}

/**
 * user roleのコンテンツを構築（データのみ）
 */
function buildUserPrompt(selectedCards, titleCandidates) {
  // カードペアリストを構築
  const pairsList = selectedCards.map((card, index) => {
    // ランダムにポエムを1つ選択
    const randomPoem = card.poems[Math.floor(Math.random() * card.poems.length)];
    return `${index + 1}. ${card.category}: ${card.condition_text} → ${randomPoem.poem_text}`;
  }).join('\n');

  // タイトル候補リストを構築
  const titleList = titleCandidates
    .map((phrase, index) => `${index + 1}. ${phrase}`)
    .join('\n');

  // データのみを返す（指示はdeveloper側に含まれている）
  return `【選択されたカードペア】
${pairsList}

【タイトル選択候補】
${titleList}`;
}

/**
 * OpenRouter APIを呼び出し（Tool Calling対応）
 */
async function callOpenRouter(developerPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in .env file');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/yourusername/mansion_poem',
      'X-Title': 'Mansion Poem Fine-tuning Dataset Generator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: developerPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: TOOLS,
      tool_choice: {
        type: 'function',
        function: { name: 'submit_poem_alchemy' }
      },
      temperature: 1.0,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Tool Callレスポンスからanalysisとfinalを取得
 */
function parseResponse(response) {
  // Tool Callsから取得
  const toolCalls = response.choices?.[0]?.message?.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    throw new Error('No tool calls found in response');
  }

  const toolCall = toolCalls[0];

  if (toolCall.function?.name !== 'submit_poem_alchemy') {
    throw new Error(`Unexpected tool call: ${toolCall.function?.name}`);
  }

  // 引数をパース
  const args = JSON.parse(toolCall.function.arguments);

  const analysisContent = args.analysis_text;
  const finalContent = args.final_json_string;

  // 検証
  if (!analysisContent || typeof analysisContent !== 'string') {
    throw new Error('Invalid or missing analysis_text');
  }

  if (!finalContent || typeof finalContent !== 'string') {
    throw new Error('Invalid or missing final_json_string');
  }

  // JSONが有効か検証
  try {
    JSON.parse(finalContent);
  } catch (e) {
    throw new Error(`Invalid JSON in final_json_string: ${finalContent}`);
  }

  return { analysisContent, finalContent };
}

/**
 * HuggingFaceH4/Multilingual-Thinking形式のデータセットサンプルを構築
 */
function buildHarmonySample(developerPrompt, userPrompt, analysisContent, finalContent) {
  // reasoning_languageを設定
  const reasoningLanguage = 'ja'; // 日本語

  // systemメッセージのコンテンツを構築
  const systemContent = `reasoning language: ${reasoningLanguage}\n\n${developerPrompt.split('\n')[0]}`;

  return {
    reasoning_language: reasoningLanguage,
    developer: developerPrompt,
    user: userPrompt,
    analysis: analysisContent,
    final: finalContent,
    messages: [
      {
        role: 'system',
        content: systemContent,
        thinking: null
      },
      {
        role: 'user',
        content: userPrompt,
        thinking: null
      },
      {
        role: 'assistant',
        content: finalContent,
        thinking: analysisContent
      }
    ]
  };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 ファインチューニングデータセット生成開始\n');
  console.log(`モデル: ${OPENROUTER_MODEL}`);
  console.log(`サンプル数: ${SAMPLE_COUNT}`);
  console.log(`出力先: ${OUTPUT_FILE}\n`);

  // 既存のファイルを削除（新規作成）
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
    console.log('📝 既存のデータセットファイルを削除しました\n');
  }

  const developerPrompt = buildDeveloperPrompt();

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    console.log(`[${i + 1}/${SAMPLE_COUNT}] サンプル生成中...`);

    try {
      // カードとタイトル候補をランダム選択
      const selectedCards = selectRandomCards(cardsData, 5);
      const titleCandidates = selectRandomCatchphrases(catchphrasesData, 20);

      // プロンプト構築
      const userPrompt = buildUserPrompt(selectedCards, titleCandidates);

      // API呼び出し
      const startTime = Date.now();
      const response = await callOpenRouter(developerPrompt, userPrompt);
      const responseTime = Date.now() - startTime;

      // Tool Callレスポンスをパース
      const { analysisContent, finalContent } = parseResponse(response);

      // Harmony形式サンプル構築
      const sample = buildHarmonySample(
        developerPrompt,
        userPrompt,
        analysisContent,
        finalContent
      );

      // JSONLファイルに追記
      fs.appendFileSync(OUTPUT_FILE, JSON.stringify(sample, null, 0) + '\n', 'utf-8');

      console.log(`   ✓ 完了 (${responseTime}ms)`);

      // レート制限対策: 少し待機
      if (i < SAMPLE_COUNT - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error(`   ✗ エラー: ${error.message}`);
      // エラーが発生しても継続
    }
  }

  console.log('\n✅ データセット生成完了');
  console.log(`📁 ファイル: ${OUTPUT_FILE}`);

  // 統計情報
  const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n').filter(l => l.trim());
  console.log(`📊 生成されたサンプル数: ${lines.length}/${SAMPLE_COUNT}`);
}

// 実行
main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
