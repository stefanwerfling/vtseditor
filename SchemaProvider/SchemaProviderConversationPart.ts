import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaProviderConversationJson} from './SchemaProviderConversationJson.js';

export enum ConversationPartRole {
    'user' = 'user',
    'model' = 'model'
}

export const SchemaProviderConversationPart = Vts.object({
    role: Vts.or([Vts.enum(ConversationPartRole), Vts.string()]),
    text: Vts.string(),
    json: Vts.or([SchemaProviderConversationJson, Vts.null()])
});

export type ProviderConversationPart = ExtractSchemaResultType<typeof SchemaProviderConversationPart>;