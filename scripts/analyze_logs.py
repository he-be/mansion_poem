#!/usr/bin/env python3
"""
ログ分析ツール - LLMモデルの生成品質を評価

Google Gemini 2.5 Flash (OpenRouter経由) を使用して、
各LLMモデルの生成したポエムを採点し、モデル別の比較レポートを生成する。
"""

import sqlite3
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
import requests
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

# 設定
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "dev-server" / "dev-logs.db"
REPORT_PATH = PROJECT_ROOT / "docs" / "llm_analysis_report.md"

# OpenRouter設定（Gemini 2.5 Flash固定）
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
EVALUATOR_MODEL = "google/gemini-2.5-flash-preview-09-2025"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# 採点基準（合計100点）
SCORING_CRITERIA = {
    "material_concealment": {
        "name": "素材の隠蔽",
        "weight": 40,
        "description": "元のネガティブ条件（北向き、崖、借地権等）を推測させない"
    },
    "unity_narrative": {
        "name": "統一性・物語性",
        "weight": 20,
        "description": "一つのテーマで統合され、物語として成立している"
    },
    "writing_style": {
        "name": "文体の適切性",
        "weight": 15,
        "description": "短文、体言止め、主語省略、リズムの良さ"
    },
    "prohibition_compliance": {
        "name": "禁止事項回避",
        "weight": 15,
        "description": "丁寧語・推量・直接呼びかけ・最上級表現を避ける"
    },
    "character_count": {
        "name": "文字数適正",
        "weight": 10,
        "description": "180-240文字の範囲内（±10文字は減点なし）"
    }
}


def get_evaluation_prompt(selected_cards: List[Dict], generated_poem: Dict[str, str]) -> str:
    """採点用プロンプトを生成"""

    # カード情報を整形
    cards_text = ""
    for i, card in enumerate(selected_cards, 1):
        condition = card.get("conditionCard", {})
        poem_card = card.get("selectedPoem", {})
        cards_text += f"{i}. [{condition.get('category', 'N/A')}] {condition.get('condition_text', 'N/A')}\n"
        cards_text += f"   → ポエム: {poem_card.get('poem_text', 'N/A')}\n"

    title = generated_poem.get("title", "")
    poem_text = generated_poem.get("poem", "")

    prompt = f"""あなたは一流不動産広告のクリエイティブディレクターとして、以下の生成されたマンションポエムを厳格に採点してください。

【元の選択されたカードペア】
{cards_text}

【生成されたポエム】
タイトル: {title}
本文:
{poem_text}

【採点基準】（合計100点満点）

1. **素材の隠蔽** (40点)
   - 元のネガティブ条件（「北向き」「崖」「借地権」「バスで駅へ10分」等）が生成文から推測できるか？
   - 完全に隠蔽できている: 40点
   - やや匂わせている: 20-30点
   - 明示的に言及: 0-10点

2. **統一性・物語性** (20点)
   - カードの「魂」を抽出し、一つの物語として再創造できているか？
   - 単なる並列ではなく、テーマで統合されているか？

3. **文体の適切性** (15点)
   - 短文・体言止め・主語省略が適切に使われているか？
   - リズムと余韻があるか？

4. **禁止事項回避** (15点)
   - 「です」「でしょう」等の丁寧語・推量を使っていないか？
   - 「あなた」等の直接呼びかけを避けているか？
   - 「最高」「完璧」等の最上級表現を避けているか？

5. **文字数適正** (10点)
   - 180-240文字（±10文字は減点なし）
   - 現在の文字数: {len(poem_text)}文字

【出力形式】
以下のJSON形式で出力してください（説明不要）:
```json
{{
  "total_score": 85,
  "scores": {{
    "material_concealment": 38,
    "unity_narrative": 18,
    "writing_style": 13,
    "prohibition_compliance": 14,
    "character_count": 10
  }},
  "comment": "総合評価のコメント（100文字以内）",
  "strengths": "優れている点（50文字以内）",
  "improvements": "改善すべき点（50文字以内）"
}}
```"""

    return prompt


def evaluate_with_gemini(prompt: str) -> Dict[str, Any]:
    """Gemini 2.5 FlashでLLM生成物を評価"""

    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set in .env file")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "Mansion Poem Log Analyzer"
    }

    payload = {
        "model": EVALUATOR_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3,  # 採点は一貫性重視
        "max_tokens": 2048
    }

    try:
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        # JSONを抽出
        json_match = content.strip()
        if "```json" in json_match:
            json_match = json_match.split("```json")[1].split("```")[0].strip()

        return json.loads(json_match)

    except Exception as e:
        print(f"Error evaluating with Gemini: {e}")
        return {
            "total_score": 0,
            "scores": {k: 0 for k in SCORING_CRITERIA.keys()},
            "comment": f"評価エラー: {str(e)}",
            "strengths": "N/A",
            "improvements": "N/A"
        }


def load_logs_from_db() -> List[Dict[str, Any]]:
    """SQLiteデータベースからログを読み込む"""

    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id, created_at, selected_cards, generated_poem,
            generation_time_ms, is_successful,
            llm_provider, llm_model, prompt_text
        FROM generation_logs
        WHERE is_successful = 1
        ORDER BY created_at DESC
    """)

    logs = []
    for row in cursor.fetchall():
        logs.append({
            "id": row[0],
            "created_at": row[1],
            "selected_cards": json.loads(row[2]),
            "generated_poem": json.loads(row[3]),
            "generation_time_ms": row[4],
            "is_successful": bool(row[5]),
            "llm_provider": row[6],
            "llm_model": row[7],
            "prompt_text": row[8]
        })

    conn.close()
    return logs


def analyze_logs():
    """ログを分析してレポートを生成"""

    print("📊 ログ分析を開始します...")
    print(f"データベース: {DB_PATH}")
    print(f"評価モデル: {EVALUATOR_MODEL}\n")

    # ログを読み込む
    logs = load_logs_from_db()
    print(f"✓ {len(logs)}件の成功ログを読み込みました\n")

    if len(logs) == 0:
        print("評価対象のログがありません。")
        sys.exit(0)

    # モデル別に評価
    results_by_model = {}

    for i, log in enumerate(logs, 1):
        model_name = log["llm_model"]

        print(f"[{i}/{len(logs)}] 評価中: {model_name} (ID: {log['id']})")

        # 評価プロンプトを生成
        eval_prompt = get_evaluation_prompt(
            log["selected_cards"],
            log["generated_poem"]
        )

        # Geminiで評価
        evaluation = evaluate_with_gemini(eval_prompt)

        # 結果を保存
        if model_name not in results_by_model:
            results_by_model[model_name] = []

        results_by_model[model_name].append({
            "log_id": log["id"],
            "created_at": log["created_at"],
            "poem": log["generated_poem"],
            "evaluation": evaluation,
            "generation_time_ms": log["generation_time_ms"]
        })

        print(f"   → スコア: {evaluation['total_score']}/100\n")

    # レポート生成
    generate_report(results_by_model)

    print(f"\n✓ 分析完了！")
    print(f"レポート: {REPORT_PATH}")


def generate_report(results_by_model: Dict[str, List[Dict]]):
    """Markdownレポートを生成"""

    report_lines = [
        "# LLMモデル生成品質分析レポート",
        "",
        f"生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"評価モデル: `{EVALUATOR_MODEL}`",
        "",
        "---",
        ""
    ]

    # サマリー
    report_lines.append("## 📊 総合サマリー")
    report_lines.append("")
    report_lines.append("| モデル | 評価件数 | 平均スコア | 標準偏差 | 最高点 | 最低点 | 平均生成時間 |")
    report_lines.append("|--------|----------|------------|----------|--------|--------|--------------|")

    for model_name, results in sorted(results_by_model.items()):
        scores = [r["evaluation"]["total_score"] for r in results]
        times = [r["generation_time_ms"] for r in results]

        avg_score = sum(scores) / len(scores)
        std_dev = (sum((s - avg_score) ** 2 for s in scores) / len(scores)) ** 0.5

        report_lines.append(
            f"| `{model_name}` | {len(results)} | "
            f"{avg_score:.1f} | {std_dev:.1f} | "
            f"{max(scores)} | {min(scores)} | {sum(times) / len(times):.0f}ms |"
        )

    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")

    # モデル別詳細
    for model_name, results in sorted(results_by_model.items()):
        report_lines.append(f"## 🔍 {model_name}")
        report_lines.append("")

        # 採点基準別の平均
        criteria_scores = {k: [] for k in SCORING_CRITERIA.keys()}
        for result in results:
            for criterion, score in result["evaluation"]["scores"].items():
                criteria_scores[criterion].append(score)

        report_lines.append("### 採点基準別平均")
        report_lines.append("")
        report_lines.append("| 採点基準 | 配点 | 平均点 | 達成率 |")
        report_lines.append("|----------|------|--------|--------|")

        for criterion_key, criterion_info in SCORING_CRITERIA.items():
            avg = sum(criteria_scores[criterion_key]) / len(criteria_scores[criterion_key])
            achievement = (avg / criterion_info["weight"]) * 100

            report_lines.append(
                f"| {criterion_info['name']} | {criterion_info['weight']}点 | "
                f"{avg:.1f}点 | {achievement:.0f}% |"
            )

        report_lines.append("")

        # 優秀例・改善例
        sorted_results = sorted(results, key=lambda r: r["evaluation"]["total_score"], reverse=True)

        if len(sorted_results) > 0:
            best = sorted_results[0]
            report_lines.append(f"### ✨ 優秀例（スコア: {best['evaluation']['total_score']}/100）")
            report_lines.append("")
            report_lines.append(f"**タイトル**: {best['poem']['title']}")
            report_lines.append("")
            report_lines.append(f"**本文**:")
            report_lines.append(f"```")
            report_lines.append(best['poem']['poem'])
            report_lines.append(f"```")
            report_lines.append("")
            report_lines.append(f"**評価**: {best['evaluation']['comment']}")
            report_lines.append(f"**強み**: {best['evaluation']['strengths']}")
            report_lines.append("")

        if len(sorted_results) > 1:
            worst = sorted_results[-1]
            report_lines.append(f"### 📝 改善例（スコア: {worst['evaluation']['total_score']}/100）")
            report_lines.append("")
            report_lines.append(f"**タイトル**: {worst['poem']['title']}")
            report_lines.append("")
            report_lines.append(f"**本文**:")
            report_lines.append(f"```")
            report_lines.append(worst['poem']['poem'])
            report_lines.append(f"```")
            report_lines.append("")
            report_lines.append(f"**評価**: {worst['evaluation']['comment']}")
            report_lines.append(f"**改善点**: {worst['evaluation']['improvements']}")
            report_lines.append("")

        report_lines.append("---")
        report_lines.append("")

    # ファイルに書き込み
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")


if __name__ == "__main__":
    analyze_logs()
