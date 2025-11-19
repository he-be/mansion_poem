
async function test() {
    try {
        const response = await fetch('http://localhost:3001/api/generate-poem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selectedPairs: [
                    {
                        conditionCard: { category: 'TEST', condition_text: 'Test Condition' },
                        selectedPoem: { poem_text: 'Test Poem' }
                    }
                ]
            })
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Body:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
