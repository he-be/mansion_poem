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

export interface GeneratePoemResult {
  title: string;
  poem: string;
}

/**
 * Gemini Flash APIを使用してポエムとタイトルを生成
 * Worker API経由で呼び出し（プロンプト構築はWorker側で実行）
 *
 * @param options 生成オプション
 * @returns 生成されたタイトルとポエム
 * @throws ネットワークエラー、生成失敗時にエラーをスロー
 */
export async function generatePoemWithGemini(
  options: GeneratePoemOptions
): Promise<GeneratePoemResult> {
  // API呼び出し（タイムアウト30秒）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    // Worker APIエンドポイントを呼び出し
    const response = await fetch('/api/generate-poem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedPairs: options.selectedPairs
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: string };
      console.error('API error response:', errorData);
      throw new Error(errorData.error || `API エラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { title?: string; poem?: string };
    const { title, poem } = data;

    if (!title || !poem) {
      console.error('API response:', data);
      throw new Error('APIからタイトルまたはポエムが生成されませんでした');
    }

    return { title, poem };
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
