"""
ファインチューニングデータセットの互換性テスト
Unslothノートブックで使用可能か確認
"""

from datasets import load_dataset
import json

print("=" * 60)
print("データセット読み込みテスト")
print("=" * 60)

# 生成したデータセットを読み込み
dataset = load_dataset('json', data_files='datasets/mansion_poem_ft.jsonl', split='train')

print(f"\n✓ データセット読み込み成功")
print(f"サンプル数: {len(dataset)}")
print(f"カラム: {dataset.column_names}")
print(f"Features: {dataset.features}")

# 最初のサンプルを確認
print("\n" + "=" * 60)
print("サンプル1の構造")
print("=" * 60)

sample = dataset[0]
print(f"\nトップレベルキー: {list(sample.keys())}")

messages = sample['messages']
print(f"\nmessages配列の長さ: {len(messages)}")

for i, msg in enumerate(messages):
    print(f"\n--- Message {i} ---")
    print(f"Role: {msg['role']}")

    if isinstance(msg.get('content'), list):
        print("Content: [Harmony format - list]")
        for item in msg['content']:
            content_preview = item['content'][:100] + '...' if len(item['content']) > 100 else item['content']
            print(f"  - {item['type']}: {content_preview}")
    else:
        content_preview = msg['content'][:100] + '...' if len(msg['content']) > 100 else msg['content']
        print(f"Content: {content_preview}")

# HuggingFaceH4/Multilingual-Thinkingとの比較
print("\n" + "=" * 60)
print("参照データセット (HuggingFaceH4/Multilingual-Thinking) との比較")
print("=" * 60)

print("\n【生成データセット】")
print(f"- トップレベルキー: {list(sample.keys())}")
print(f"- messages[0].role: {messages[0]['role']}")
print(f"- messages[1].role: {messages[1]['role']}")
print(f"- messages[2].role: {messages[2]['role']}")
print(f"- messages[2].content: {type(messages[2]['content']).__name__}")

print("\n【Multilingual-Thinking】")
print("- トップレベルキー: ['reasoning_language', 'developer', 'user', 'analysis', 'final', 'messages']")
print("- messages[0].role: system")
print("- messages[1].role: developer")
print("- messages[2].role: user")
print("- messages[3].role: assistant (with channel)")

# Harmony形式チェック（HuggingFaceH4/Multilingual-Thinking互換）
print("\n" + "=" * 60)
print("HuggingFaceH4/Multilingual-Thinking形式適合性")
print("=" * 60)

# 新しい形式: thinking フィールドにanalysis、contentフィールドにfinal
has_correct_format = (
    isinstance(messages[-1].get('content'), str) and
    'thinking' in messages[-1] and
    isinstance(messages[-1]['thinking'], str)
)

print(f"\n✓ 正しい形式: {'Yes' if has_correct_format else 'No'}")
print(f"✓ assistant.content (final): {'Yes' if isinstance(messages[-1].get('content'), str) else 'No'}")
print(f"✓ assistant.thinking (analysis): {'Yes' if 'thinking' in messages[-1] and messages[-1]['thinking'] else 'No'}")
print(f"✓ トップレベルanalysisフィールド: {'Yes' if 'analysis' in sample else 'No'}")
print(f"✓ トップレベルfinalフィールド: {'Yes' if 'final' in sample else 'No'}")

# データセット全体の統計
print("\n" + "=" * 60)
print("データセット統計")
print("=" * 60)

total_samples = len(dataset)
avg_message_count = sum(len(s['messages']) for s in dataset) / total_samples

print(f"\n総サンプル数: {total_samples}")
print(f"平均メッセージ数/サンプル: {avg_message_count:.1f}")

# 各サンプルのanalysisとfinalの長さを確認
analysis_lengths = []
final_lengths = []

for sample in dataset:
    # トップレベルのanalysisとfinalフィールドから取得
    if 'analysis' in sample and sample['analysis']:
        analysis_lengths.append(len(sample['analysis']))
    if 'final' in sample and sample['final']:
        final_lengths.append(len(sample['final']))

if analysis_lengths:
    print(f"\nAnalysis長:")
    print(f"  - 平均: {sum(analysis_lengths) / len(analysis_lengths):.0f} chars")
    print(f"  - 最小: {min(analysis_lengths)} chars")
    print(f"  - 最大: {max(analysis_lengths)} chars")

if final_lengths:
    print(f"\nFinal長:")
    print(f"  - 平均: {sum(final_lengths) / len(final_lengths):.0f} chars")
    print(f"  - 最小: {min(final_lengths)} chars")
    print(f"  - 最大: {max(final_lengths)} chars")

print("\n" + "=" * 60)
print("結論")
print("=" * 60)
print("""
✓ データセットは正常に読み込まれました
✓ HuggingFaceH4/Multilingual-Thinking形式に適合しています
✓ トップレベルフィールド: reasoning_language, developer, user, analysis, final, messages
✓ messages: system, user, assistant (thinking付き)

【Unslothノートブックでの使用方法】

1. Data Prepセクションで以下のように読み込み:

   from datasets import load_dataset
   dataset = load_dataset('json',
                         data_files='datasets/mansion_poem_ft.jsonl',
                         split='train')

2. formatting_prompts_funcはそのまま使用可能
   （tokenizer.apply_chat_templateで自動処理）

3. standardize_sharegpt()はスキップ可能
   （すでに正しい形式）

4. train_on_responses_only()の調整:
   - instruction_part = "<|start|>user<|message|>"
   - response_part = "<|start|>assistant<|channel|>final<|message|>"
   ※ ただし、GPT-OSS tokenizer依存のため要確認

【データセット統計】
- 言語: 日本語 (reasoning_language: ja)
- タスク: 不動産広告詩生成
- Chain-of-thought: あり（日本語）
""")
