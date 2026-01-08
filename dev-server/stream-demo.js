



const LLAMA_SERVER_URL = 'http://100.121.61.11:8080/v1/chat/completions';

const MODEL_NAME = 'gpt-oss-20b-mansion-poem';

async function runDemo() {
    console.log('--- Starting Streaming Demo ---');

    const body = {
        model: MODEL_NAME,
        messages: [
            { role: "system", content: "You are a creative director. Output JSON using the submit_poem_alchemy tool." },
            { role: "user", content: "Generate a poem about a luxury mansion." }
        ],
        tools: [
            {
                type: 'function',
                function: {
                    name: 'submit_poem_alchemy',
                    description: 'Submit analysis and final JSON',
                    parameters: {
                        type: 'object',
                        properties: {
                            analysis_text: { type: 'string' },
                            final_json_string: { type: 'string' }
                        },
                        required: ['analysis_text', 'final_json_string']
                    }
                }
            }
        ],
        tool_choice: 'auto',
        temperature: 0.6,
        max_tokens: -1,
        stream: true
    };

    try {
        const response = await fetch(LLAMA_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Web Streams API handling
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('\n--- Stream Finished ---');
                console.log('--- Full Content ---');
                console.log(fullContent);
                console.log('--- End Full Content ---');
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.trim() === 'data: [DONE]') {
                    // End of stream handled by loop break usually, but good to note
                    continue;
                }
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const delta = data.choices[0].delta;

                        if (delta.reasoning) {
                            process.stdout.write(`[Reasoning] ${delta.reasoning}`);
                        } else if (delta.content) {
                            process.stdout.write(delta.content);
                            fullContent += delta.content;
                        }
                    } catch (e) {
                        // console.error('Error parsing line:', line, e);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

runDemo();
