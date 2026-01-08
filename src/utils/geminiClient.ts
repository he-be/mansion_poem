/**
 * Google Gemini Flash API クライアント
 *
 * マンションポエムの最終生成に使用
 * モデル: gemini-flash-latest のみ使用
 */

import type { SelectedPair } from '@/types/card';

export interface GeneratePoemOptions {
  selectedPairs: SelectedPair[];
  onProgress?: (text: string, isReasoning: boolean) => void;
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
  // API呼び出し（タイムアウト120秒 - ストリーミングなので長めに）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 延長

  try {
    // Worker APIエンドポイントを呼び出し
    const response = await fetch('/api/generate-poem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedPairs: options.selectedPairs,
        stream: true
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: string };
      console.error('API error response:', errorData);
      throw new Error(errorData.error || `API エラー: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr);
            const delta = data.choices?.[0]?.delta;

            if (delta) {
              if (delta.reasoning) {
                options.onProgress?.(delta.reasoning, true);
              }
              if (delta.content) {
                options.onProgress?.(delta.content, false);
                fullContent += delta.content;
              }
            }
          } catch (e) {
            // Ignore parse errors for chunks
          }
        }
      }
    }

    // JSON抽出ロジック
    // content をパース（新モデルのチャネル形式と従来形式の両方に対応）
    let title = '';
    let poem = '';
    let jsonText = fullContent;

    const channelMatch1 = fullContent.match(/<\|channel\|>final_json_string[^{]*?(\{[\s\S]*?\})\s*$/);
    const channelMatch2 = fullContent.match(/<\|channel\|>final_json_string[^<]*<\|message\|>([\s\S]*?)(?:<\|channel\||$)/);
    const jsonMatch = fullContent.match(/```json\s*\n?([\s\S]*?)\n?```/);
    const broadMatch = fullContent.match(/(\{[\s\S]*?"final_json_string"[\s\S]*\})(?:\s*\)|;)*$/) || fullContent.match(/(\{[\s\S]*?"final_json_string"[\s\S]*?\})/);

    if (broadMatch) {
      jsonText = broadMatch[1];
    } else if (channelMatch1) {
      jsonText = channelMatch1[1].trim();
    } else if (channelMatch2) {
      jsonText = channelMatch2[1].trim();
    } else if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    // JSONの末尾が切れている場合の簡易補正（必要なら）
    // 完全なJSONであることを期待するが、ストリーム切れ等で壊れている場合はエラーになる

    if (!jsonText || !jsonText.trim()) {
      console.error('API response content empty');
      throw new Error('APIから有効なレスポンスが得られませんでした (Empty Response)');
    }

    // HTML判定: < で始まり、かつ <| (モデルの特殊トークン) で始まらない場合をエラーとする
    if (jsonText.trim().startsWith('<') && !jsonText.trim().startsWith('<|')) {
      console.error('Received HTML instead of JSON:', jsonText.substring(0, 200));
      throw new Error('APIからHTMLエラーが返されました。サーバーの状態を確認してください。');
    }

    let parsed;
    try {
      // コメント削除 (// ...)
      jsonText = jsonText.replace(/\/\/.*$/gm, '');
      parsed = JSON.parse(jsonText);

      // final_json_string が文字列として内包されている場合の展開
      if (parsed.final_json_string && typeof parsed.final_json_string === 'string') {
        try {
          parsed = JSON.parse(parsed.final_json_string);
        } catch (e2) {
          console.warn('Failed to parse inner final_json_string:', e2);
          // パース失敗しても元のparsedにtitle/poemがある可能性に賭ける
        }
      }
    } catch (e) {
      console.error('JSON Parse Error:', e);
      console.error('Problematic JSON text:', jsonText);
      throw new Error('APIレスポンスの解析に失敗しました (JSON Parse Error)');
    }

    title = parsed.title || '';
    poem = parsed.poem || '';

    if (!title || !poem) {
      // JSONではないが、平文で返ってきた場合のフォールバックなどを検討してもよいが
      // ここでは厳密にエラーとする
      console.error('API response content:', fullContent);
      throw new Error('APIから有効なタイトルまたはポエムが生成されませんでした');
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
