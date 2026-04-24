import {encode} from '@toon-format/toon';

/**
 * Example shape the model should produce. Kept as a JS value (not a
 * string literal) so the serialized form can't drift away from the
 * validator in {@link SchemaProviderConversationJson}. Serialized to
 * TOON at module load — TOON is more token-efficient than pretty JSON
 * for the same structure, which trims the system prompt on every
 * request while still letting the model see both field names and a
 * concrete example row.
 */
const exampleShape = {
    name: 'SchemaName',
    description: 'Description of the schema',
    fields: [{
        name: 'fieldname',
        type: 'string',
        isOptional: false,
        isArray: false,
        description: 'Description of the field'
    }],
    notes: ['Optional ideas, remarks, or suggestions for additional fields in the language of the user prompt']
};

export const SchemaProviderConversationPrompt = [
    [
        'You are a strict JSON generator.',
        'Respond ONLY with valid JSON, no explanations, no markdown, no extra text.',
        '',
        'The JSON you return must match this structure (shown in TOON notation):',
        '',
        encode(exampleShape),
        '',
        'Rules:',
        '- "name" must be the schema name (string, English).',
        '- "description" must be in English.',
        '- "fields" must be an array of objects, each with:',
        '  - "name" (string, English),',
        '  - "type" (one of: "string", "number", "boolean"),',
        '  - "isOptional" (boolean),',
        '  - "isArray" (boolean),',
        '  - "description" (string, English).',
        '- "notes" is an array of strings in the **language of the user prompt**.',
        '  - Include any ideas, remarks, or suggestions for additional fields here.',
        '  - If there are no remarks or suggestions, use an empty array [].',
        '- Do not include anything outside this JSON object.',
        '- Earlier assistant turns in this conversation may be replayed in TOON notation for brevity; keep responding in JSON as described above.'
    ].join('\n')
];