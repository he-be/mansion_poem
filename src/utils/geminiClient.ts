/**
 * Google Gemini Flash API クライアント
 *
 * マンションポエムの最終生成に使用
 * モデル: gemini-flash-latest のみ使用
 */

import type { SelectedPair } from '@/types/card';

export interface GeneratePoemOptions {
  selectedPairs: SelectedPair[];
}

/**
 * プロンプトを構築する
 */
function buildPrompt(selectedPairs: SelectedPair[]): string {
  const pairsList = selectedPairs
    .map((pair, index) =>
      `${index + 1}. 条件: ${pair.conditionCard.condition_text} → ポエム: ${pair.selectedPoem.poem_text}`
    )
    .join('\n');

  return `あなたは不動産チラシのコピーライターです。以下の条件とポエムの組み合わせから、魅力的なマンションのチラシ本文を生成してください。

【選択されたカードペア】
${pairsList}

【要件】
- 文体は詩的で格調高く、不動産広告らしい言い回しを使用してください
- 上記の条件とポエムの組み合わせの魅力を最大限に引き出してください
- 200〜400文字程度で記述してください
- マンションの魅力を感じさせる、印象的な文章にしてください
- 具体的な条件は直接言及せず、選ばれたポエムの雰囲気を活かして全体を統合した詩的な文章を作成してください

【出力】
チラシ本文のみを出力してください（説明や前置きは不要です）`;
}

/**
 * Gemini Flash APIを使用してポエムを生成
 *
 * @param options 生成オプション
 * @returns 生成されたポエム
 * @throws APIキー未設定、ネットワークエラー、生成失敗時にエラーをスロー
 */
export async function generatePoemWithGemini(
  options: GeneratePoemOptions
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません。.envファイルにVITE_GEMINI_API_KEYを設定してください。');
  }

  // プロンプト構築
  const prompt = buildPrompt(options.selectedPairs);

  // API呼び出し（タイムアウト30秒）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API エラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('Gemini API response:', data);
      throw new Error('Gemini APIからテキストが生成されませんでした');
    }

    return generatedText.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('リクエストがタイムアウトしました。もう一度お試しください。');
      }
      throw error;
    }

    throw new Error('ポエムの生成中に予期しないエラーが発生しました');
  }
}
