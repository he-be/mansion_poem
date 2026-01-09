
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_ENDPOINT = 'http://localhost:3001/api/generate-poem'; // Dev server
const SAMPLE_COUNT = 10;
const DEBUG_DIR = path.join(__dirname, '../debug_streaming');

// Load Data
const cardsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/cards.json'), 'utf-8')
);

// Helper: Select Random Pairs
// Helper: Select Random Pairs
function selectRandomPairs(count) {
    const shuffledCards = [...cardsData].sort(() => Math.random() - 0.5).slice(0, count);
    return shuffledCards.map(card => {
        const randomPoem = card.poems[Math.floor(Math.random() * card.poems.length)];
        return {
            conditionCard: card,
            selectedPoem: randomPoem
        };
    });
}

// Client-Side Parsing Logic to Verify (Mirroring intent for geminiClient.ts)
function parseStreamContent(fullContent) {
    let jsonText = fullContent;

    // Regexes
    const channelMatch1 = fullContent.match(/<\|channel\|>final_(?:json|output)[\w_]*[^{]*?(\{[\s\S]*?\})\s*$/);
    const channelMatch2 = fullContent.match(/<\|channel\|>final_(?:json|output)[\w_]*[^<]*<\|message\|>([\s\S]*?)(?:<\|channel\||$)/);
    // [FIX] Handle quoted string format: <|channel|>final_json_string "{ ... }"
    const channelStringMatch = fullContent.match(/<\|channel\|>final_(?:json|output)[\w_]*\s*("(?:\\[\s\S]|[^"\\])*")/);
    // [FIX] Handle simple key-value match if outer text is malformed (missing {)
    const valueStringMatch = fullContent.match(/"final_(?:json|output)[\w_]*"\s*:\s*("(?:\\[\s\S]|[^"\\])*")/);
    const jsonMatch = fullContent.match(/```json\s*\n?([\s\S]*?)\n?```/);
    // [FIX] Greedy match to capture nested braces
    const broadMatch = fullContent.match(/(\{[\s\S]*?"final_json_string"[\s\S]*\})(?:\s*\)|;)*$/) || fullContent.match(/(\{[\s\S]*?"final_json_string"[\s\S]*?\})/);

    if (broadMatch) {
        jsonText = broadMatch[1];
    } else if (valueStringMatch) {
        jsonText = valueStringMatch[1];
        jsonText = jsonText.replace(/\r?\n/g, '\\n');
    } else if (channelStringMatch) {
        jsonText = channelStringMatch[1];
        jsonText = jsonText.replace(/\r?\n/g, '\\n'); // Sanitize newlines in quote
    } else if (channelMatch1) {
        jsonText = channelMatch1[1].trim();
    } else if (channelMatch2) {
        jsonText = channelMatch2[1].trim();
    } else if (jsonMatch) {
        jsonText = jsonMatch[1];
    }

    if (!jsonText || !jsonText.trim()) throw new Error('Empty JSON text extracted');

    // HTML Check
    if (jsonText.trim().startsWith('<') && !jsonText.trim().startsWith('<|')) {
        throw new Error('Detected HTML response');
    }

    // Comment Strip
    jsonText = jsonText.replace(/\/\/.*$/gm, '');

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        // Parsing failed (e.g. malformed JSON). Proceed to nested/fallback checks.
    }

    // If it was a stringified JSON (from channelStringMatch or internal final_json_string)
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
            // keep string if fail? likely error though
        }
    }

    // Handle nested final_json_string in object
    if (parsed && parsed.final_json_string && typeof parsed.final_json_string === 'string') {
        try {
            parsed = JSON.parse(parsed.final_json_string);
        } catch (e) { } // ignore
    }

    // [Fallback] Direct Property Extraction (User Suggestion)
    // If parsing failed or attributes missing, try direct regex on fullContent
    if (!parsed || !parsed.title || !parsed.poem) {
        const titleMatch = fullContent.match(/"title"\s*:\s*("(?:\\[\s\S]|[^"\\])*")/);
        const poemMatch = fullContent.match(/"poem"\s*:\s*("(?:\\[\s\S]|[^"\\])*")/);

        if (titleMatch && poemMatch) {
            try {
                parsed = parsed || {};
                parsed.title = JSON.parse(titleMatch[1]);
                parsed.poem = JSON.parse(poemMatch[1]);
            } catch (e) {
                // ignore
            }
        }
    }

    return parsed;
}

async function runTest(index) {
    console.log(`\n[${index + 1}/${SAMPLE_COUNT}] Testing Stream...`);
    const selectedPairs = selectRandomPairs(3);

    let fullContent = '';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedPairs, stream: true }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader(); // Node 18+ web streams
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices?.[0]?.delta?.content) {
                            fullContent += data.choices[0].delta.content;
                        }
                    } catch (e) { }
                }
            }
        }

        // console.log('Full Content Length:', fullContent.length);

        const result = parseStreamContent(fullContent);
        if (result.title && result.poem) {
            console.log('✅ Success:', result.title);
            return true;
        } else {
            throw new Error('Parsed JSON missing title/poem');
        }

    } catch (error) {
        console.error('❌ Failed:', error.message);
        if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

        fs.writeFileSync(path.join(DEBUG_DIR, `failure_${Date.now()}.txt`), fullContent || 'Empty Content');
        return false;
    }
}

async function main() {
    console.log('Starting Robustness Test against', API_ENDPOINT);
    let successCount = 0;

    for (let i = 0; i < SAMPLE_COUNT; i++) {
        const success = await runTest(i);
        if (success) successCount++;
    }

    console.log(`\nResult: ${successCount}/${SAMPLE_COUNT} passed.`);
    if (successCount === SAMPLE_COUNT) {
        console.log('ALL TESTS PASSED. Logic is robust.');
    } else {
        console.error('SOME TESTS FAILED.');
        process.exit(1);
    }
}

main();
