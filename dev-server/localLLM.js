/**
 * ローカル開発用ミドルウェアサーバー
 * LM Studioを使用してポエムを生成
 */

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

// LM Studio エンドポイント（.envから読み込む）
const LM_STUDIO_URL = process.env.VITE_LOCAL_LLM_URL || 'http://192.168.0.199:1234/v1/chat/completions';

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

    console.log('[LocalLLM] Generating poem with LM Studio...');

    // LM Studio (OpenAI互換形式) にリクエスト
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
        temperature: 0.9,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LocalLLM] LM Studio API error:', errorText);
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      console.error('[LocalLLM] No text generated:', data);
      throw new Error('LM Studioからテキストが生成されませんでした');
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
      console.error('[LocalLLM] JSON parse error:', parseError);
      console.error('[LocalLLM] Raw text:', trimmedText);
      throw new Error('生成されたテキストのJSON解析に失敗しました');
    }

    const generationTime = Date.now() - startTime;
    console.log(`[LocalLLM] ✓ Generated in ${generationTime}ms`);

    res.json({ title, poem });

  } catch (error) {
    const generationTime = Date.now() - startTime;
    console.error(`[LocalLLM] ✗ Error after ${generationTime}ms:`, error.message);

    res.status(500).json({
      error: error.message || 'ポエムの生成に失敗しました'
    });
  }
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LocalLLM Dev Server' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 LocalLLM Dev Server running on http://localhost:${PORT}`);
  console.log(`📡 LM Studio: ${LM_STUDIO_URL}\n`);
});
