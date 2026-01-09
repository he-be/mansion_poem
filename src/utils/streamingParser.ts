/**
 * ストリーミングされる思考テキストを解析し、表示用のバブル（Thought）に変換するパーサー
 */

export interface StreamingThought {
    id: number;
    text: string;
    type: 'header' | 'item' | 'normal';
    timestamp: number;
}

export class StreamingParser {
    private buffer: string = '';
    private currentId: number = 0;
    private thoughts: StreamingThought[] = [];

    // バッファをフラッシュする閾値（文字数）
    private static readonly FLUSH_THRESHOLD = 30;

    /**
     * 新しいテキストチャンクを追加し、検出された思考のリストを返す
     * @param text Chunk text
     * @returns New thoughts detected in this chunk
     */
    public append(text: string): StreamingThought[] {
        this.buffer += text;
        const newThoughts: StreamingThought[] = [];

        // 区切り文字による分割判定
        // 【...】 や // ... や 行区切りを検出

        // 1. セクションヘッダー 【...】
        // 2. リストアイテム 1. ... や ・ ...
        // 3. ある程度の長さの文 + 句読点

        // シンプルなラインベース処理 + バッファリング
        // 改行が含まれているかチェック
        let newlineIndex = this.buffer.indexOf('\n');

        while (newlineIndex !== -1) {
            const line = this.buffer.slice(0, newlineIndex).trim();
            this.buffer = this.buffer.slice(newlineIndex + 1);

            if (line) {
                const thought = this.createThought(line);
                if (thought) {
                    newThoughts.push(thought);
                    this.thoughts.push(thought);
                }
            }

            newlineIndex = this.buffer.indexOf('\n');
        }

        // バッファが長すぎる場合、句読点などで強制分割を試みる
        if (this.buffer.length > StreamingParser.FLUSH_THRESHOLD * 2) {
            // 句点「。」や「、」で分割
            const punctIndex = Math.max(
                this.buffer.lastIndexOf('。'),
                this.buffer.lastIndexOf('、'),
                this.buffer.lastIndexOf('.'),
                this.buffer.lastIndexOf(',')
            );

            if (punctIndex !== -1) {
                const part = this.buffer.slice(0, punctIndex + 1).trim();
                if (part) {
                    const thought = this.createThought(part);
                    if (thought) {
                        newThoughts.push(thought);
                        this.thoughts.push(thought);
                    }
                }
                this.buffer = this.buffer.slice(punctIndex + 1);
            }
        }

        return newThoughts;
    }

    private createThought(text: string): StreamingThought | null {
        // ノイズ除去（JSONの断片など）
        if (text.startsWith('"') || text.startsWith('}')) return null;
        if (text.includes('final_json_string')) return null;

        let type: StreamingThought['type'] = 'normal';

        // ヘッダー判定
        if (text.startsWith('【') || text.startsWith('//') || text.startsWith('##') || text.endsWith(':')) {
            type = 'header';
        }
        // リスト判定
        else if (text.match(/^[0-9]+\./) || text.startsWith('・') || text.startsWith('- ')) {
            type = 'item';
        }

        return {
            id: ++this.currentId,
            text: text.replace(/^"|"$/g, '').replace(/\\n/g, ''), // 引用符やエスケープ除去
            type,
            timestamp: Date.now()
        };
    }

    public getBuffer(): string {
        return this.buffer;
    }

    public clear(): void {
        this.buffer = '';
        this.thoughts = [];
        this.currentId = 0;
    }
}
