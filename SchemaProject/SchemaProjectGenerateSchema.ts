import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaProviderConversationPart} from '../SchemaProvider/SchemaProviderConversationPart.js';

/**
 * Schema project generate schema
 */
export const SchemaProjectGenerateSchema = Vts.object({
    description: Vts.string()
});

/**
 * Type of project generate schema
 */
export type ProjectGenerateSchema = ExtractSchemaResultType<typeof SchemaProjectGenerateSchema>;

export const SchemaProjectGenerateSchemaResponse = Vts.object({
    conversation: Vts.array(SchemaProviderConversationPart)
});

export type ProjectGenerateSchemaResponse = ExtractSchemaResultType<typeof SchemaProjectGenerateSchemaResponse>;