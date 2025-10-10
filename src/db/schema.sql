-- 生成ログテーブル（最小限）
CREATE TABLE IF NOT EXISTS generation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 入力
  selected_cards TEXT NOT NULL,  -- JSON文字列で保存

  -- 出力
  generated_poem TEXT NOT NULL,

  -- メタデータ
  generation_time_ms INTEGER,
  is_successful BOOLEAN DEFAULT 1
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at ON generation_logs(created_at);
