/**
 * スコアリングシステムの精度検証スクリプト
 *
 * 既存のraw_responses.jsonlとfiltered_responses.jsonlを比較して、
 * 新しいスコアリングシステムの精度を検証する
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data/dpo');
const RAW_FILE = path.join(DATA_DIR, 'raw_responses.jsonl');
const FILTERED_FILE = path.join(DATA_DIR, 'filtered_responses.jsonl');

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
 * スコアリング関数（collect_responses.jsから抽出）
 */
function calculateQualityScore(poem) {
  let qualityScore = 100;
  const scoreDetails = [];

  // 1. 抽象語の過密度チェック（-15点×出現回数）
  const abstractWords = {
    '哲学': 0,
    '美学': 0,
    '思想': 0,
    '佇まい': 0,
    '刻': 0, // 「刻」と「刻（とき）」を合計
    '躍動': 0,
    '風雅': 0
  };

  // 抽象語をカウント（「刻」は「刻（とき）」も含む）
  abstractWords['哲学'] = (poem.match(/哲学/g) || []).length;
  abstractWords['美学'] = (poem.match(/美学/g) || []).length;
  abstractWords['思想'] = (poem.match(/思想/g) || []).length;
  abstractWords['佇まい'] = (poem.match(/佇まい/g) || []).length;
  abstractWords['刻'] = (poem.match(/刻（とき）|刻(?!（とき）)/g) || []).length;
  abstractWords['躍動'] = (poem.match(/躍動/g) || []).length;
  abstractWords['風雅'] = (poem.match(/風雅/g) || []).length;

  const abstractCount = Object.values(abstractWords).reduce((a, b) => a + b, 0);

  if (abstractCount > 0) {
    const penalty = abstractCount * 15;
    qualityScore -= penalty;
    scoreDetails.push(`抽象語過多(-${penalty}点, ${abstractCount}個)`);
  }

  // 2. 同一語彙の過度な繰り返し（-20点）
  const commonWords = ['場所', '都市', '住まい', '空間'];
  for (const word of commonWords) {
    const count = (poem.match(new RegExp(word, 'g')) || []).length;
    if (count >= 2) {
      qualityScore -= 20;
      scoreDetails.push(`語彙繰り返し(-20点, ${word}×${count})`);
    }
  }

  // 3. 具体的自然描写の有無（+20点）
  const natureWords = ['光', '緑', '緑陰', '水', '風', '空', '四季', '季節', '樹', '雲', '大地', '山'];
  const hasNature = natureWords.some(word => poem.includes(word));
  if (hasNature) {
    qualityScore += 20;
    scoreDetails.push('自然描写(+20点)');
  }

  // 4. 感情語の有無（+15点）
  const emotionWords = ['安らぎ', '満たされ', '優しさ', '安堵', '充足', '喜び', '心地'];
  const hasEmotion = emotionWords.some(word => poem.includes(word));
  if (hasEmotion) {
    qualityScore += 15;
    scoreDetails.push('感情語(+15点)');
  }

  // 5. 段落構造（-20点：1段落のみ＆150文字以上）
  const paragraphs = poem.split('\n\n').filter(p => p.trim());
  if (paragraphs.length === 1 && poem.length >= 150) {
    qualityScore -= 20;
    scoreDetails.push('段落構造不良(-20点)');
  }

  // 6. 文長の多様性（+10点：標準偏差が10以上）
  const sentences = poem.split('。').filter(s => s.trim());
  if (sentences.length > 1) {
    const lengths = sentences.map(s => s.trim().length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev >= 10) {
      qualityScore += 10;
      scoreDetails.push('文長多様性(+10点)');
    }
  }

  // 7. 体言止めの過度な使用（-10点：2回以上）
  const taiGenPatterns = [
    /として。/g,
    /のため。/g,
    /の場所。/g,
    /の領域。/g,
    /の刻。/g,
    /のこと。/g
  ];
  let taiGenCount = 0;
  for (const pattern of taiGenPatterns) {
    taiGenCount += (poem.match(pattern) || []).length;
  }
  if (taiGenCount >= 2) {
    qualityScore -= 10;
    scoreDetails.push(`体言止め過多(-10点, ${taiGenCount}回)`);
  }

  // 8. 「哲学」の過度な使用（-25点：2回以上）
  const philosophyCount = (poem.match(/哲学/g) || []).length;
  if (philosophyCount >= 2) {
    qualityScore -= 25;
    scoreDetails.push(`哲学過多(-25点, ${philosophyCount}回)`);
  }

  // 9. 短文の戦略的使用（+10点：15文字以下の文が1つ以上）
  const hasShortSentence = sentences.some(s => s.trim().length <= 15 && s.trim().length > 0);
  if (hasShortSentence) {
    qualityScore += 10;
    scoreDetails.push('短文使用(+10点)');
  }

  return { score: qualityScore, details: scoreDetails };
}

/**
 * メイン処理
 */
function main() {
  console.log('========== スコアリングシステム精度検証 ==========\n');

  // データ読み込み
  const rawData = loadJSONL(RAW_FILE);
  const filteredData = loadJSONL(FILTERED_FILE);

  if (rawData.length === 0) {
    console.error('✗ エラー: raw_responses.jsonl が見つかりません');
    process.exit(1);
  }

  // 人間の判定をマップ化
  const humanAccepted = new Set();
  for (const group of filteredData) {
    for (const response of group.responses) {
      humanAccepted.add(`${group.prompt_id}_${response.response_id}`);
    }
  }

  // 統計情報
  const stats = {
    total: 0,
    humanAccepted: 0,
    humanRejected: 0,
    scoreAccepted: 0,
    scoreRejected: 0,
    truePositive: 0,  // 人間○ & スコア○
    trueNegative: 0,  // 人間× & スコア×
    falsePositive: 0, // 人間× & スコア○
    falseNegative: 0, // 人間○ & スコア×
  };

  const detailedResults = [];

  // 各応答をスコアリング
  for (const group of rawData) {
    for (const response of group.responses) {
      if (!response.passed) continue; // 基本ルールで落ちたものはスキップ

      stats.total++;

      const key = `${group.prompt_id}_${response.response_id}`;
      const isHumanAccepted = humanAccepted.has(key);
      const scoreResult = calculateQualityScore(response.poem);
      const isScoreAccepted = scoreResult.score >= 80;

      if (isHumanAccepted) stats.humanAccepted++;
      else stats.humanRejected++;

      if (isScoreAccepted) stats.scoreAccepted++;
      else stats.scoreRejected++;

      if (isHumanAccepted && isScoreAccepted) {
        stats.truePositive++;
      } else if (!isHumanAccepted && !isScoreAccepted) {
        stats.trueNegative++;
      } else if (!isHumanAccepted && isScoreAccepted) {
        stats.falsePositive++;
        detailedResults.push({
          type: 'FP',
          prompt_id: group.prompt_id,
          response_id: response.response_id,
          score: scoreResult.score,
          details: scoreResult.details,
          poem: response.poem.substring(0, 100) + '...'
        });
      } else if (isHumanAccepted && !isScoreAccepted) {
        stats.falseNegative++;
        detailedResults.push({
          type: 'FN',
          prompt_id: group.prompt_id,
          response_id: response.response_id,
          score: scoreResult.score,
          details: scoreResult.details,
          poem: response.poem.substring(0, 100) + '...'
        });
      }
    }
  }

  // 精度計算
  const accuracy = ((stats.truePositive + stats.trueNegative) / stats.total * 100).toFixed(1);
  const precision = (stats.truePositive / (stats.truePositive + stats.falsePositive) * 100).toFixed(1);
  const recall = (stats.truePositive / (stats.truePositive + stats.falseNegative) * 100).toFixed(1);
  const f1 = (2 * precision * recall / (parseFloat(precision) + parseFloat(recall))).toFixed(1);

  // 結果表示
  console.log('基本統計:');
  console.log(`  総応答数（基本ルール通過）: ${stats.total}`);
  console.log(`  人間採用: ${stats.humanAccepted} (${(stats.humanAccepted / stats.total * 100).toFixed(1)}%)`);
  console.log(`  人間不採用: ${stats.humanRejected} (${(stats.humanRejected / stats.total * 100).toFixed(1)}%)`);
  console.log('');

  console.log('混同行列:');
  console.log(`  真陽性（TP）: ${stats.truePositive} - 人間○ & スコア○`);
  console.log(`  真陰性（TN）: ${stats.trueNegative} - 人間× & スコア×`);
  console.log(`  偽陽性（FP）: ${stats.falsePositive} - 人間× & スコア○ ← 過大評価`);
  console.log(`  偽陰性（FN）: ${stats.falseNegative} - 人間○ & スコア× ← 過小評価`);
  console.log('');

  console.log('精度指標:');
  console.log(`  正解率（Accuracy）: ${accuracy}%`);
  console.log(`  適合率（Precision）: ${precision}%`);
  console.log(`  再現率（Recall）: ${recall}%`);
  console.log(`  F1スコア: ${f1}%`);
  console.log('');

  // 誤分類の詳細表示
  if (detailedResults.length > 0) {
    console.log('========== 誤分類の詳細 ==========\n');

    const fp = detailedResults.filter(r => r.type === 'FP');
    const fn = detailedResults.filter(r => r.type === 'FN');

    if (fp.length > 0) {
      console.log(`【偽陽性（FP）: ${fp.length}件】スコアは高いが人間が不採用`);
      for (const item of fp) {
        console.log(`\n${item.prompt_id} response_${item.response_id} (スコア: ${item.score}点)`);
        console.log(`  ${item.details.join(', ')}`);
        console.log(`  "${item.poem}"`);
      }
      console.log('');
    }

    if (fn.length > 0) {
      console.log(`【偽陰性（FN）: ${fn.length}件】スコアは低いが人間が採用`);
      for (const item of fn) {
        console.log(`\n${item.prompt_id} response_${item.response_id} (スコア: ${item.score}点)`);
        console.log(`  ${item.details.join(', ')}`);
        console.log(`  "${item.poem}"`);
      }
    }
  }

  console.log('\n========== 検証完了 ==========');
}

main();
