/**
 * ローカル開発用ミドルウェアサーバー
 * 複数のLLMプロバイダーに対応（LM Studio、OpenRouter）
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// プロバイダー設定（.envから読み込む）
const LLM_PROVIDER = process.env.DEV_LLM_PROVIDER || 'lmstudio';
const LM_STUDIO_URL = process.env.VITE_LOCAL_LLM_URL || 'http://localhost:1234/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.DEV_OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// データファイルの読み込み
const catchphrasesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/catchphrases.json'), 'utf-8')
);

const promptTemplate = fs.readFileSync(
  path.join(__dirname, '../src/data/prompt.txt'),
  'utf-8'
);

/**
 * ランダムにキャッチフレーズを選択（worker.tsと同じロジック）
 */
function selectRandomCatchphrases(catchphrases, count = 20) {
  const shuffled = [...catchphrases].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * プロンプトを構築（worker.tsと同じロジック）
 */
function buildPrompt(selectedPairs) {
  const selectedCatchphrases = selectRandomCatchphrases(catchphrasesData);
  const titleCandidates = selectedCatchphrases
    .map((phrase, index) => `${index + 1}. ${phrase}`)
    .join('\n');

  const pairsList = selectedPairs
    .map((pair, index) =>
      `${index + 1}. ${pair.conditionCard.category}: ${pair.conditionCard.condition_text} → ${pair.selectedPoem.poem_text}`
    )
    .join('\n');

  return promptTemplate
    .replace('{PAIRS_LIST}', pairsList)
    .replace('{TITLE_CANDIDATES}', titleCandidates);
}

/**
 * LLMリクエストを送信（プロバイダーに応じて処理を分岐）
 */
async function sendLLMRequest(prompt) {
  if (LLM_PROVIDER === 'openrouter') {
    // OpenRouterへリクエスト
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set. Please set it in .env file.');
    }

    console.log(`[OpenRouter] Model: ${OPENROUTER_MODEL}`);

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Mansion Poem Dev',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 1.0,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouter] API error:', errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    return await response.json();
  } else {
    // LM Studio（デフォルト）
    console.log(`[LM Studio] URL: ${LM_STUDIO_URL}`);

    const response = await fetch(LM_STUDIO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 1.0,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LM Studio] API error:', errorText);
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    return await response.json();
  }
}

/**
 * /api/generate-poem エンドポイント
 */
app.post('/api/generate-poem', async (req, res) => {
  const startTime = Date.now();

  try {
    const { selectedPairs } = req.body;

    if (!selectedPairs || !Array.isArray(selectedPairs)) {
      return res.status(400).json({ error: 'Invalid request: selectedPairs is required' });
    }

    // プロンプト構築
    const prompt = buildPrompt(selectedPairs);

    console.log(`[${LLM_PROVIDER.toUpperCase()}] Generating poem...`);

    // LLMリクエスト送信
    const data = await sendLLMRequest(prompt);
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      console.error(`[${LLM_PROVIDER.toUpperCase()}] No text generated:`, data);
      throw new Error('テキストが生成されませんでした');
    }

    // JSON形式のレスポンスをパース
    const trimmedText = generatedText.trim();
    let title = '';
    let poem = '';

    try {
      // JSONコードブロックを抽出（```json ... ``` の形式に対応）
      const jsonMatch = trimmedText.match(/```json\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : trimmedText;

      const parsed = JSON.parse(jsonText);
      title = parsed.title || '';
      poem = parsed.poem || '';

      if (!title || !poem) {
        throw new Error('titleまたはpoemが見つかりません');
      }
    } catch (parseError) {
      console.error(`[${LLM_PROVIDER.toUpperCase()}] JSON parse error:`, parseError);
      console.error(`[${LLM_PROVIDER.toUpperCase()}] Raw text:`, trimmedText);
      throw new Error('生成されたテキストのJSON解析に失敗しました');
    }

    const generationTime = Date.now() - startTime;
    console.log(`[${LLM_PROVIDER.toUpperCase()}] ✓ Generated in ${generationTime}ms`);

    res.json({ title, poem });

  } catch (error) {
    const generationTime = Date.now() - startTime;
    console.error(`[${LLM_PROVIDER.toUpperCase()}] ✗ Error after ${generationTime}ms:`, error.message);

    res.status(500).json({
      error: error.message || 'ポエムの生成に失敗しました'
    });
  }
});

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'LocalLLM Dev Server' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 LocalLLM Dev Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Configuration:`);
  console.log(`   Provider: ${LLM_PROVIDER}`);

  if (LLM_PROVIDER === 'openrouter') {
    console.log(`   Model: ${OPENROUTER_MODEL}`);
    console.log(`   API Key: ${OPENROUTER_API_KEY ? '✓ Set' : '✗ Not set'}`);
    console.log(`   URL: ${OPENROUTER_URL}`);
  } else {
    console.log(`   URL: ${LM_STUDIO_URL}`);
  }

  console.log(`\n💡 To change provider, edit DEV_LLM_PROVIDER in .env file`);
  console.log(`   - lmstudio: Local LM Studio (offline)`);
  console.log(`   - openrouter: OpenRouter (online, various models)\n`);
});
