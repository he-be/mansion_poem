/**
 * card_1007.txt から cards.json を生成するスクリプト
 *
 * Usage: node scripts/convertCardsData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ファイルパス
const INPUT_FILE = path.join(__dirname, '../docs/card_1007.txt');
const OUTPUT_FILE = path.join(__dirname, '../src/data/cards.json');

/**
 * card_1007.txt をパースしてカードデータを抽出
 */
function parseCardData(content) {
  const lines = content.split('\n');
  const cards = [];
  let currentCategory = '';
  let cardIdCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行はスキップ
    if (!line) continue;

    // カテゴリ行の検出（日本語のみで構成される行）
    if (line && !line.includes('\t') && !line.includes('条件カード') && !line.includes('ポエムカード')) {
      currentCategory = line;
      continue;
    }

    // ヘッダー行はスキップ
    if (line.includes('条件カード（現実）') || line.includes('ポエムカード（言い訳')) {
      continue;
    }

    // カード行の処理（タブ区切り）
    if (line.includes('\t') && currentCategory) {
      const parts = line.split('\t').filter(p => p.trim());

      if (parts.length >= 2) {
        const conditionText = parts[0].trim();
        const poemText = parts[1].trim();

        // 有効なデータのみ追加
        if (conditionText && poemText) {
          const cardId = `condition-${String(cardIdCounter).padStart(3, '0')}`;
          const poemId = `poem-${String(cardIdCounter).padStart(3, '0')}-a`;

          cards.push({
            id: cardId,
            category: currentCategory,
            condition_text: conditionText,
            poems: [
              {
                id: poemId,
                poem_text: poemText
              }
            ]
          });

          cardIdCounter++;
        }
      }
    }
  }

  return cards;
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log('📖 Reading card_1007.txt...');
    const content = fs.readFileSync(INPUT_FILE, 'utf-8');

    console.log('🔍 Parsing card data...');
    const cards = parseCardData(content);

    console.log(`✅ Parsed ${cards.length} cards`);

    // カテゴリ別の統計を表示
    const categoryCounts = cards.reduce((acc, card) => {
      acc[card.category] = (acc[card.category] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Cards by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} cards`);
    });

    // 出力ディレクトリを確認
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      console.log(`\n📁 Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // JSON ファイルに出力
    console.log(`\n💾 Writing to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cards, null, 2), 'utf-8');

    console.log('✨ Successfully generated cards.json!');
    console.log(`\n📍 Output: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
main();
