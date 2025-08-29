import {ExtractSchemaResultType, Vts} from 'vts';

export const SchemaProviderConversationJsonField = Vts.object({
    name: Vts.string(),
    type: Vts.string(),
    isOptional: Vts.boolean(),
    isArray: Vts.boolean(),
    description: Vts.string()
});

export const SchemaProviderConversationJson = Vts.object({
    name: Vts.string(),
    description: Vts.string(),
    fields: Vts.array(SchemaProviderConversationJsonField),
    notes: Vts.array(Vts.string())
});

export type ProviderConversationJson = ExtractSchemaResultType<typeof SchemaProviderConversationJson>;