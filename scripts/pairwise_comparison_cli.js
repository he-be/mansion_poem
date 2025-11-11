/**
 * DPOペアワイズ比較CLIツール
 *
 * filtered_responses.jsonl を読み込み、人間による総当たり比較を行う
 * 勝率でランキング→DPO組生成
 * 中断・再開可能（進捗は .comparison_progress.json に保存）
 *
 * 操作:
 * - 1: 応答1が優れている
 * - 2: 応答2が優れている
 * - =: 同点（両方に勝ちを追加）
 * - u: 前に戻る
 * - s: このペアをスキップ
 * - q: 保存して終了
 *
 * 出力: data/dpo/dpo_dataset_human_ranked.jsonl
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data/dpo');
const INPUT_FILE = path.join(DATA_DIR, 'filtered_responses.jsonl');
const OUTPUT_FILE = path.join(DATA_DIR, 'dpo_dataset_human_ranked.jsonl');
const PROGRESS_FILE = path.join(DATA_DIR, '.comparison_progress.json');

/**
 * JSONL読み込み
 */
function loadJSONL(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

/**
 * 進捗読み込み
 */
function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { comparisons: [] };
  }

  return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
}

/**
 * 進捗保存
 */
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * DPO組を保存（追記モード）
 */
function saveDPOPair(pair) {
  fs.appendFileSync(OUTPUT_FILE, JSON.stringify(pair) + '\n', 'utf-8');
}

/**
 * CLIクリア
 */
function clearScreen() {
  console.clear();
}

/**
 * プロンプト表示
 */
function displayPromptHeader(promptData, promptIndex, totalPrompts) {
  console.log('========================================');
  console.log(`プロンプト ${promptIndex + 1}/${totalPrompts}`);
  console.log('========================================');
  console.log(promptData.prompt);
  console.log('');
}

/**
 * ペア比較表示
 */
function displayPair(response1, response2, pairIndex, totalPairs) {
  console.log('----------------------------------------');
  console.log(`比較 ${pairIndex + 1}/${totalPairs}`);
  console.log('========================================');
  console.log('【応答1】');
  console.log(`タイトル: ${response1.title}`);
  console.log('');
  console.log(response1.poem);
  console.log('');
  console.log('【応答2】');
  console.log(`タイトル: ${response2.title}`);
  console.log('');
  console.log(response2.poem);
  console.log('');
}

/**
 * キー入力待ち（1文字）
 */
function promptKey(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (key) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();

      const char = key.toString('utf8').toLowerCase();
      console.log(char); // エコー
      resolve(char);
    });
  });
}

/**
 * ペア生成（nC2）
 */
function generatePairs(responses) {
  const pairs = [];
  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

/**
 * ランキング構築
 */
function buildRanking(responses, comparisons) {
  const n = responses.length;
  const winCounts = new Array(n).fill(0);
  const lossCounts = new Array(n).fill(0);

  for (const comp of comparisons) {
    if (comp.winner === 1) {
      winCounts[comp.index1]++;
      lossCounts[comp.index2]++;
    } else if (comp.winner === 2) {
      winCounts[comp.index2]++;
      lossCounts[comp.index1]++;
    } else if (comp.winner === 'tie') {
      // 同点の場合は両方に勝ちを追加
      winCounts[comp.index1]++;
      winCounts[comp.index2]++;
    }
  }

  const ranked = responses.map((resp, index) => ({
    ...resp,
    wins: winCounts[index],
    losses: lossCounts[index],
    winRate: winCounts[index] / (winCounts[index] + lossCounts[index] || 1)
  }));

  // 勝率でソート（降順）
  ranked.sort((a, b) => b.winRate - a.winRate);

  return ranked;
}

/**
 * DPO組作成
 */
function createDPOPairs(prompt, ranked) {
  const pairs = [];

  if (ranked.length < 2) {
    return pairs; // 2個未満の場合はDPO組なし
  }

  // 通過数に応じてChosen候補を決定
  const chosenCount = ranked.length >= 6 ? 3 : 2;
  const chosenCandidates = ranked.slice(0, Math.min(chosenCount, ranked.length));
  const rejectedCandidates = ranked.slice(chosenCandidates.length);

  // Chosen × Rejected（全組み合わせ）
  for (const chosen of chosenCandidates) {
    for (const rejected of rejectedCandidates) {
      pairs.push({
        prompt,
        chosen: chosen.poem,
        rejected: rejected.poem
      });
    }
  }

  return pairs;
}

/**
 * メイン処理
 */
async function main() {
  // データ読み込み
  console.log('データ読み込み中...');
  const filteredData = loadJSONL(INPUT_FILE);

  if (filteredData.length === 0) {
    console.error(`✗ エラー: ${INPUT_FILE} が見つからないか空です`);
    process.exit(1);
  }

  const progress = loadProgress();
  const allComparisons = progress.comparisons || [];

  console.log(`\n✓ ${filteredData.length}件のプロンプトグループを読み込みました`);

  if (allComparisons.length > 0) {
    console.log(`✓ 進捗を復元しました（${allComparisons.length}件の比較済み）`);
  }

  console.log('\n操作方法:');
  console.log('  [1] 応答1が優れている  [2] 応答2が優れている  [=] 同点');
  console.log('  [u] 前に戻る  [s] スキップ  [q] 保存して終了');
  console.log('\n開始します...\n');

  // 出力ファイル初期化（最初の実行時のみ）
  if (allComparisons.length === 0 && fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  let shouldExit = false;

  // プロンプトごとに処理
  for (let promptIndex = 0; promptIndex < filteredData.length && !shouldExit; promptIndex++) {
    const promptData = filteredData[promptIndex];

    if (promptData.responses.length < 2) {
      console.log(`プロンプト ${promptIndex + 1}: 応答が2個未満のためスキップ`);
      continue;
    }

    // ペア生成
    const pairs = generatePairs(promptData.responses);

    // このプロンプトの比較履歴を取得
    const promptComparisons = allComparisons.filter(c => c.prompt_id === promptData.prompt_id);
    let currentPairIndex = promptComparisons.length;

    console.log(`\nプロンプト ${promptIndex + 1}/${filteredData.length}: ${pairs.length}組の比較`);

    // ペアごとに比較
    while (currentPairIndex < pairs.length && !shouldExit) {
      clearScreen();

      const [index1, index2] = pairs[currentPairIndex];
      const response1 = promptData.responses[index1];
      const response2 = promptData.responses[index2];

      // プロンプト表示
      displayPromptHeader(promptData, promptIndex, filteredData.length);

      // ペア表示
      displayPair(response1, response2, currentPairIndex, pairs.length);

      // キー入力待ち
      const key = await promptKey('\n> ');

      if (key === '1') {
        allComparisons.push({
          prompt_id: promptData.prompt_id,
          pair_index: currentPairIndex,
          index1,
          index2,
          winner: 1
        });
        currentPairIndex++;
      } else if (key === '2') {
        allComparisons.push({
          prompt_id: promptData.prompt_id,
          pair_index: currentPairIndex,
          index1,
          index2,
          winner: 2
        });
        currentPairIndex++;
      } else if (key === '=') {
        allComparisons.push({
          prompt_id: promptData.prompt_id,
          pair_index: currentPairIndex,
          index1,
          index2,
          winner: 'tie'
        });
        currentPairIndex++;
      } else if (key === 'u') {
        // 前に戻る（このプロンプトの最後の比較を削除）
        const lastCompIndex = allComparisons.findLastIndex(c => c.prompt_id === promptData.prompt_id);
        if (lastCompIndex >= 0) {
          allComparisons.splice(lastCompIndex, 1);
          currentPairIndex = Math.max(0, currentPairIndex - 1);
        }
      } else if (key === 's') {
        // スキップ
        currentPairIndex++;
      } else if (key === 'q') {
        shouldExit = true;
      } else {
        // 無効なキー
        continue;
      }

      // 進捗保存
      saveProgress({ comparisons: allComparisons });
    }

    // このプロンプトの比較が完了した場合、ランキング＆DPO組生成
    if (currentPairIndex >= pairs.length && !shouldExit) {
      console.log('\nランキング構築中...');

      const promptComparisonsComplete = allComparisons.filter(c => c.prompt_id === promptData.prompt_id);
      const ranked = buildRanking(promptData.responses, promptComparisonsComplete);

      console.log('\nランキング:');
      ranked.forEach((resp, i) => {
        console.log(`  ${i + 1}位: 勝率${(resp.winRate * 100).toFixed(0)}% (${resp.wins}勝${resp.losses}敗)`);
      });

      const dpoPairs = createDPOPairs(promptData.prompt, ranked);
      console.log(`\nDPO組: ${dpoPairs.length}組生成`);

      for (const pair of dpoPairs) {
        saveDPOPair(pair);
      }

      console.log('✓ 保存完了\n');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 一瞬表示
    }
  }

  // 最終統計
  console.log('\n========== ペアワイズ比較完了 ==========');
  console.log(`総比較数: ${allComparisons.length}`);
  console.log(`出力: ${OUTPUT_FILE}`);
  console.log('======================================\n');

  // 進捗ファイル削除（全完了時のみ）
  if (!shouldExit && fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log('✓ ペアワイズ比較完了');
}

// 実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
