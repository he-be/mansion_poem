// Cloudflare Workers のエントリーポイント
import catchphrasesData from './data/catchphrases.json'
import { selectRandomCatchphrases } from './utils/copySelector'

export interface Env {
  ASSETS: Fetcher;
  // Secrets Store バインディングの型定義を修正
  GEMINI_API_KEY: {
    get(): Promise<string | null>; // ★ 修正点: getメソッドは引数を取りません
  };
  // KV Namespace バインディング
  CARDS_KV: KVNamespace;
  // D1 Database バインディング
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API エンドポイント: /api/generate-poem
    if (url.pathname === '/api/generate-poem' && request.method === 'POST') {
      return handleGeneratePoem(request, env);
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Static Assets を配信 (Vue SPA)
    return env.ASSETS.fetch(request);
  },
};

async function handleGeneratePoem(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  let generatedPoem = '';
  let error: string | undefined;

  try {
    const body = await request.json() as { selectedPairs?: any[] };
    const { selectedPairs } = body;

    if (!selectedPairs || !Array.isArray(selectedPairs)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: selectedPairs is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Secrets StoreからAPIキーを取得
    // ★ 修正点: get()の引数を削除
    const apiKey = await env.GEMINI_API_KEY.get();

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in Secrets Store');
    }

    // キャッチコピーをランダムに20個選択
    const selectedCatchphrases = selectRandomCatchphrases(catchphrasesData as string[]);
    const titleCandidates = selectedCatchphrases
      .map((phrase, index) => `${index + 1}. ${phrase}`)
      .join('\n');

    // KVからプロンプトテンプレートを取得
    let promptTemplate = await env.CARDS_KV.get('prompt:poem_generation', 'text');
    if (!promptTemplate) {
      // フォールバック: 従来のbuildPrompt関数を使用
      promptTemplate = buildPromptFallback(selectedPairs, titleCandidates);
    } else {
      // プロンプトテンプレートにカードペアとタイトル候補を埋め込み
      const pairsList = selectedPairs
        .map((pair, index) =>
          `${index + 1}. ${pair.conditionCard.category}: ${pair.conditionCard.condition_text} → ${pair.selectedPoem.poem_text}`
        )
        .join('\n');
      promptTemplate = promptTemplate
        .replace('{PAIRS_LIST}', pairsList)
        .replace('{TITLE_CANDIDATES}', titleCandidates);
    }

    const prompt = promptTemplate;

    // Gemini APIを呼び出し（gemini-flash-latestを使用）
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            top_p: 0.85,
            top_k: 60,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('Gemini API response:', data);
      throw new Error('Gemini APIからテキストが生成されませんでした');
    }

    // JSON形式のレスポンスをパース
    const trimmedText = generatedText.trim();
    let title = '';
    let poem = '';

    try {
      // JSONコードブロックを抽出（```json ... ``` の形式に対応）
      const jsonMatch = trimmedText.match(/```json\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : trimmedText;

      const parsed = JSON.parse(jsonText) as { title?: string; poem?: string };
      title = parsed.title || '';
      poem = parsed.poem || '';

      if (!title || !poem) {
        throw new Error('titleまたはpoemが見つかりません');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw text:', trimmedText);
      throw new Error('生成されたテキストのJSON解析に失敗しました');
    }

    generatedPoem = poem;
    const generationTime = Date.now() - startTime;

    // D1にログ記録（awaitして確実に実行）
    try {
      await logGeneration(env, selectedPairs, generatedPoem, generationTime, true);
    } catch (logErr) {
      console.error('Failed to log generation:', logErr);
    }

    return new Response(JSON.stringify({ title, poem: generatedPoem }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to generate poem';
    const generationTime = Date.now() - startTime;

    // エラーもログ記録
    try {
      await logGeneration(env, [], '', generationTime, false, error);
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }

    console.error('Error generating poem:', err);
    return new Response(
      JSON.stringify({ error }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// ログ記録関数（最小限）
async function logGeneration(
  env: Env,
  selectedPairs: any[],
  generatedPoem: string,
  generationTime: number,
  isSuccessful: boolean,
  _errorMessage?: string
): Promise<void> {
  try {
    console.log('Logging to DB...', { hasDB: !!env.DB, pairsCount: selectedPairs.length });

    if (!env.DB) {
      console.error('env.DB is undefined!');
      return;
    }

    const result = await env.DB.prepare(`
      INSERT INTO generation_logs (selected_cards, generated_poem, generation_time_ms, is_successful)
      VALUES (?, ?, ?, ?)
    `).bind(
      JSON.stringify(selectedPairs),
      generatedPoem,
      generationTime,
      isSuccessful ? 1 : 0
    ).run();

    console.log('DB log success:', result.meta);
  } catch (err) {
    console.error('DB log failed:', err);
  }
}

// フォールバック用（KVにプロンプトがない場合）
function buildPromptFallback(selectedPairs: any[], titleCandidates: string): string {
  const pairsList = selectedPairs
    .map((pair, index) =>
      `${index + 1}. ${pair.conditionCard.category}: ${pair.conditionCard.condition_text} → ${pair.selectedPoem.poem_text}`
    )
    .join('\n');

  return `あなたは一流不動産広告のクリエイティブディレクターです。
選択されたポエムカードの組み合わせから、心に響くマンション広告本文とタイトルを創造してください。

【重要】各カードを単に並べるのではなく、それらの本質を抽出し、
一つの流れる物語として「再構築」してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【選択されたカードペア】
${pairsList}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【タイトル選択候補】
以下の実在のマンションキャッチコピーから、今回生成する広告本文に最も相応しいタイトルを1つ選択してください:
${titleCandidates}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【統合の指針】
あなたのタスクは「組み合わせ」ではなく「昇華」です。
以下のプロセスで統合を行ってください：

1. 全カードに通底する「核心テーマ」を特定する
   （例：都市と自然の共存、時間の価値、特別な日常）

2. そのテーマを軸に、各要素を有機的に結びつける
   - 対比構造を活用（都市の賑わい vs 住空間の静謐）
   - 時間軸で統合（歴史→現在→未来）
   - 空間軸で統合（街→建物→住空間）

3. 個別のフレーズを消化し、新しい言葉として再生成
   - 選ばれたポエムの「言い回し」を使うのではなく「意味」を使う
   - 3つの異なる要素を1つの文に溶け込ませる

【文章構造】3-5段落、180-300文字
┌─────────────────────────┐
│ 第1段落：環境の本質を詩的に描写       │
│   → 立地や街の特徴から始める         │
│   → 具体的地名があれば活用           │
│                                       │
│ 第2-3段落：生活体験の価値を展開       │
│   → 選択されたポエムの要素をここで統合 │
│   → 対比や時間の流れで自然につなぐ     │
│                                       │
│ 最終段落：所有の意味を昇華           │
│   → 「ここに住まう」価値の提示         │
│   → 余韻を残す締めくくり             │
└─────────────────────────┘

【文体の原則】
✓ 短文を「。」で区切る断定的な文体
✓ 体言止めと通常文を2:8程度で混在させる
✓ 主語は極力省略し、場所や住まいを主語にする
✓ 読点「、」を戦略的に配置し、リズムと余韻を生む
✓ 抽象的で詩的な表現だが、意味不明にはしない

【必須の統合技法】
× 悪い例：「A。B。C。」（単純な並列）
○ 良い例：「Aという環境が、Bという価値を生み、Cという日常へと昇華する」

具体的には：
・選ばれた3つのポエムを3つの文に分けない
・代わりに、3つの意味を含んだ統一された文章を創る
・接続は暗示的に（接続詞より、意味のつながりで）
・各段落が前の段落の余韻を受け取り、次へ渡す

【語彙選択】
推奨語：静謐、佇まい、緑陰、洗練、風雅、刻（とき）、邸、澄む
対比語：賑わいと静けさ、都心と緑、活気と安らぎ
禁止語：最高、一番、絶対、完璧、完全（不動産広告規制）

【避けるべき表現】
× 「○○です」「○○でしょう」の丁寧語・推量
× 「あなた」「貴方」の直接的呼びかけ
× 「門」「司令室」「プロローグ」等の具体的メタファー
× 選ばれたポエムカードのコピー＆ペースト
× 過度に長い一文（40文字超）

【統合の実例】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
選択されたカード：
「都心と程よい距離を保つ、静寂の丘」
「天空の静寂を掌中に収める、天空邸宅」
「光を招き入れる設計思想が、日々を彩る」

❌ 悪い統合（単純な羅列）：
「都心と程よい距離を保つ、静寂の丘。天空の静寂を掌中に収める、
天空邸宅。光を招き入れる設計思想が、日々を彩る。」

✓ 良い統合（再構築と昇華）：
「丘の上に、都心を臨みながら静けさを抱く邸がある。
ここは地上の喧騒を離れ、天空の静謐を日常とする場所。
光が描く刻の移ろいが、暮らしに彩りを添える。
選ばれた者だけが知る、新しい東京の姿。」
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【あなたへの具体的指示】
1. まず、選ばれたカード全体が「何を伝えたいのか」本質を1行で要約
2. その本質を中心に、各要素が自然に溶け込む物語を構築
3. 読点と句点で流れるようなリズムを作る
4. 音読して心地よいか確認（頭の中で読んでみる）
5. カードの言葉を「そのまま使う」のではなく「意味を使って再創造」

【最終チェック】
□ 選ばれたカードが単に並んでいるだけになっていないか
□ 全体で一つの統一されたテーマを持っているか
□ 3段落以上の構成で、流れがあるか
□ 体言止めは適度か（多すぎず）
□ 具体的数値や仕様を直接言及していないか
□ 読んで余韻が残るか

【出力形式】
以下のJSON形式で出力してください。説明や前置きは不要です:
\`\`\`json
{
  "title": "選択したキャッチコピーをそのまま記載",
  "poem": "生成した広告本文"
}
\`\`\`

**重要**:
- titleは【タイトル選択候補】から選んだものを**一字一句そのまま**記載
- poemは生成した広告本文のみ（説明不要）
- JSON形式以外の出力は一切不要`;
}