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
      `${index + 1}. ${pair.conditionCard.category}: ${pair.conditionCard.condition_text} → ${pair.selectedPoem.poem_text}`
    )
    .join('\n');

  return `あなたは不動産広告のコピーライターです。以下の条件とポエムの組み合わせから、マンションの魅力を伝える短い本文を生成してください。

【選択されたカードペア】
${pairsList}

【マンションポエムのルール】
1. 構成: 3-5段落、200-350文字程度の簡潔なポエム
2. 文体:
   - 短文を句点「。」で区切る断定的な文体
   - 抽象的で詩的な表現を重視
   - 具体的な数値や条件は直接言及しない
3. 表現技法:
   - 選ばれたポエムの言葉を活かして再構成
   - 「〜である」「〜がある」ではなく、名詞止めや体言止めを多用
   - 住人を主語にせず、住まいや場所を主語にする
4. 避けるべき表現:
   - 「貴方」「あなた」といった直接的な呼びかけ
   - 「〜でしょう」「〜です」といった丁寧語・推量表現
   - 過度に長い一文
   - 「門」「司令室（コックピット）」「プロローグ」などの具体的なメタファー

【良い例】
「都心と程よい距離を保つ、静寂の丘。天空の静寂を掌中に収める、天空邸宅。光を招き入れる設計思想が、日々を彩る。四季の装いを美しく収める、人生のコレクションステージ。公と私を華麗に横断する、境界のないワークスタイル。ここに、新しい生活の形がある。」

【出力】
チラシ本文のみを簡潔に出力してください（説明や前置きは不要です）`;
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
