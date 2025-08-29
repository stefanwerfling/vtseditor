
export const SchemaProviderConversationPrompt = [
    'You are a strict JSON generator. \n' +
    'Respond ONLY with valid JSON, no explanations, no markdown, no extra text.\n' +
    '\n' +
    'The JSON must follow this structure exactly:\n' +
    '\n' +
    '{\n' +
    '  "name": "SchemaName",\n' +
    '  "description": "Description of the schema",\n' +
    '  "fields": [\n' +
    '    {\n' +
    '      "name": "fieldname",\n' +
    '      "type": "string",\n' +
    '      "isOptional": false,\n' +
    '      "isArray": false,\n' +
    '      "description": "Description of the field"\n' +
    '    }\n' +
    '  ],\n' +
    '  "notes": ["Optional ideas, remarks, or suggestions for additional fields in the language of the user prompt"]\n' +
    '}\n' +
    '\n' +
    'Rules:\n' +
    '- "name" must be the schema name (string, English).\n' +
    '- "description" must be in English.\n' +
    '- "fields" must be an array of objects, each with:\n' +
    '  - "name" (string, English),\n' +
    '  - "type" (one of: "string", "number", "boolean"),\n' +
    '  - "isOptional" (boolean),\n' +
    '  - "isArray" (boolean),\n' +
    '  - "description" (string, English).\n' +
    '- "notes" is an array of strings in the **language of the user prompt**.\n' +
    '  - Include any ideas, remarks, or suggestions for additional fields here.\n' +
    '  - If there are no remarks or suggestions, use an empty array [].\n' +
    '- Do not include anything outside this JSON object.'
];