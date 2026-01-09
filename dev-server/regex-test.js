
const inputs = [
    // Case 1: Standard wrapped string
    `<|channel|>final_json_string
"{
  \\"title\\": \\"Test Quote\\",
  \\"poem\\": \\"Test Poem\\"
}"`,

    // Case 2: Broad match object
    `{
  "final_json_string": "{\\"title\\": \\"Test2\\", \\"poem\\": \\"Poem2\\"}"
  }`
];

function testRegex(fullContent) {
    console.log('--- Testing Content ---');
    console.log(fullContent);

    // Current Regexes
    const channelMatch1 = fullContent.match(/<\|channel\|>final_json_string[^{]*?(\{[\s\S]*?\})\s*$/);
    const broadMatch = fullContent.match(/(\{[\s\S]*?"final_json_string"[\s\S]*\})(?:\s*\)|;)*$/);

    // START NEW REGEX IDEA
    // Look for string starting with "
    const channelStringMatch = fullContent.match(/<\|channel\|>final_json_string\s*("[\s\S]*?")/);

    let jsonText = '';

    if (broadMatch) {
        console.log('Matched Broad');
        jsonText = broadMatch[1];
    } else if (channelStringMatch) {
        console.log('Matched Channel String');
        jsonText = channelStringMatch[1];
    } else if (channelMatch1) {
        console.log('Matched Channel Object');
        jsonText = channelMatch1[1];
    }

    console.log('Extracted JSON Text:', jsonText);

    try {
        let parsed = JSON.parse(jsonText);
        if (typeof parsed === 'string') {
            console.log('Parsed is string, parsing again...');
            parsed = JSON.parse(parsed);
        }
        if (parsed.final_json_string && typeof parsed.final_json_string === 'string') {
            console.log('Inner final_json_string found, parsing...');
            parsed = JSON.parse(parsed.final_json_string);
        }
        console.log('SUCCESS:', parsed);
    } catch (e) {
        console.error('FAIL:', e.message);
    }
}

inputs.forEach(testRegex);
