/**
 * DPO応答フィルタリングCLIツール
 *
 * raw_responses.jsonl を読み込み、人間による採用/不採用の判定を行う
 * 中断・再開可能（進捗は .filter_progress.json に保存）
 *
 * 操作:
 * - y: 採用
 * - n: 不採用
 * - u: 前に戻る
 * - q: 保存して終了
 *
 * 出力: data/dpo/filtered_responses.jsonl
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data/dpo');
const INPUT_FILE = path.join(DATA_DIR, 'raw_responses.jsonl');
const OUTPUT_FILE = path.join(DATA_DIR, 'filtered_responses.jsonl');
const PROGRESS_FILE = path.join(DATA_DIR, '.filter_progress.json');

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
    return { decisions: [] };
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
 * フィルタ済み応答を保存（追記モード）
 */
function saveFilteredGroup(promptId, prompt, acceptedResponses) {
  if (acceptedResponses.length === 0) {
    return; // 採用なしの場合は保存しない
  }

  const group = {
    prompt_id: promptId,
    prompt,
    responses: acceptedResponses
  };

  fs.appendFileSync(OUTPUT_FILE, JSON.stringify(group) + '\n', 'utf-8');
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
function displayPrompt(promptData, promptIndex, totalPrompts) {
  console.log('========================================');
  console.log(`プロンプト ${promptIndex + 1}/${totalPrompts}`);
  console.log('========================================');
  console.log(promptData.prompt);
  console.log('');
}

/**
 * 応答表示
 */
function displayResponse(response, responseIndex, totalResponses) {
  console.log('----------------------------------------');
  console.log(`応答 ${responseIndex + 1}/${totalResponses} (${response.passed ? '通過' : '不合格'})`);
  console.log('----------------------------------------');

  if (!response.passed) {
    console.log(`理由: ${response.reason || response.error}`);
    return;
  }

  console.log(`タイトル: ${response.title}`);
  console.log('');
  console.log(response.poem);
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
 * メイン処理
 */
async function main() {
  // データ読み込み
  console.log('データ読み込み中...');
  const rawData = loadJSONL(INPUT_FILE);

  if (rawData.length === 0) {
    console.error(`✗ エラー: ${INPUT_FILE} が見つからないか空です`);
    process.exit(1);
  }

  const progress = loadProgress();
  const decisions = progress.decisions || [];

  console.log(`\n✓ ${rawData.length}件のプロンプトグループを読み込みました`);

  if (decisions.length > 0) {
    console.log(`✓ 進捗を復元しました（${decisions.length}件の判定済み）`);
  }

  console.log('\n操作方法:');
  console.log('  [y] 採用  [n] 不採用  [u] 前に戻る  [q] 保存して終了');
  console.log('\n開始します...\n');

  // 出力ファイル初期化（最初の実行時のみ）
  if (decisions.length === 0 && fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  let currentDecisionIndex = decisions.length;
  let shouldExit = false;

  // 全応答をフラットなリストに展開
  const flatResponses = [];
  for (const promptData of rawData) {
    for (const response of promptData.responses) {
      flatResponses.push({
        prompt_id: promptData.prompt_id,
        prompt: promptData.prompt,
        response_id: response.response_id,
        response
      });
    }
  }

  // メインループ
  while (currentDecisionIndex < flatResponses.length && !shouldExit) {
    clearScreen();

    const item = flatResponses[currentDecisionIndex];
    const promptData = rawData.find(p => p.prompt_id === item.prompt_id);
    const promptIndex = rawData.indexOf(promptData);
    const responseIndex = promptData.responses.indexOf(item.response);

    // プロンプト表示
    displayPrompt(promptData, promptIndex, rawData.length);

    // 応答表示
    displayResponse(item.response, responseIndex, promptData.responses.length);

    // passed=false の場合は自動スキップ
    if (!item.response.passed) {
      console.log('\n[自動スキップ: 不合格応答]');
      decisions.push({
        prompt_id: item.prompt_id,
        response_id: item.response_id,
        accepted: false,
        auto_skipped: true
      });
      currentDecisionIndex++;
      await new Promise(resolve => setTimeout(resolve, 500)); // 一瞬表示
      continue;
    }

    // キー入力待ち
    const key = await promptKey('\n> ');

    if (key === 'y') {
      decisions.push({
        prompt_id: item.prompt_id,
        response_id: item.response_id,
        accepted: true
      });
      currentDecisionIndex++;
    } else if (key === 'n') {
      decisions.push({
        prompt_id: item.prompt_id,
        response_id: item.response_id,
        accepted: false
      });
      currentDecisionIndex++;
    } else if (key === 'u') {
      if (currentDecisionIndex > 0) {
        decisions.pop();
        currentDecisionIndex--;
      }
    } else if (key === 'q') {
      shouldExit = true;
    } else {
      // 無効なキー
      continue;
    }

    // 進捗保存
    saveProgress({ decisions });
  }

  // 結果集計＆出力
  console.log('\n結果を集計中...');

  // プロンプトごとに採用応答をグループ化
  const groupedResults = {};

  for (const decision of decisions) {
    if (!decision.accepted) continue;

    if (!groupedResults[decision.prompt_id]) {
      const promptData = rawData.find(p => p.prompt_id === decision.prompt_id);
      groupedResults[decision.prompt_id] = {
        prompt_id: decision.prompt_id,
        prompt: promptData.prompt,
        responses: []
      };
    }

    const promptData = rawData.find(p => p.prompt_id === decision.prompt_id);
    const response = promptData.responses.find(r => r.response_id === decision.response_id);

    if (response && response.passed) {
      groupedResults[decision.prompt_id].responses.push({
        response_id: response.response_id,
        poem: response.poem,
        title: response.title
      });
    }
  }

  // ファイル書き込み（上書きモード）
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  let totalAccepted = 0;
  for (const group of Object.values(groupedResults)) {
    if (group.responses.length > 0) {
      saveFilteredGroup(group.prompt_id, group.prompt, group.responses);
      totalAccepted += group.responses.length;
    }
  }

  // 統計表示
  const totalDecisions = decisions.filter(d => !d.auto_skipped).length;
  const totalAcceptedDecisions = decisions.filter(d => d.accepted && !d.auto_skipped).length;
  const acceptRate = totalDecisions > 0 ? (totalAcceptedDecisions / totalDecisions * 100).toFixed(1) : 0;

  console.log('\n========== フィルタリング完了 ==========');
  console.log(`判定数: ${totalDecisions}`);
  console.log(`採用数: ${totalAcceptedDecisions}`);
  console.log(`採用率: ${acceptRate}%`);
  console.log(`出力: ${OUTPUT_FILE}`);
  console.log('======================================\n');

  // 進捗ファイル削除
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log('✓ フィルタリング完了');
}

// 実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
