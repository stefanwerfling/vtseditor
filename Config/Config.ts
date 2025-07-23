import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema config project code
 */
export const SchemaConfigProjectCode = Vts.object({
    schemaPrefix: Vts.optional(Vts.string()),
    createTypes: Vts.optional(Vts.boolean()),
    createIndex: Vts.optional(Vts.boolean()),
    codeComment: Vts.optional(Vts.boolean()),
    codeIndent: Vts.optional(Vts.string())
});

/**
 * Schema config project
 */
export const SchemaConfigProject = Vts.object({
    schemaPath: Vts.string(),
    code: Vts.optional(SchemaConfigProjectCode),
    autoGenerate: Vts.optional(Vts.boolean()),
    destinationPath: Vts.optional(Vts.string()),

});

/**
 * Schema of config server
 */
export const SchemaConfigServer = Vts.object({
    port: Vts.number()
});

/**
 * Schema of Config
 */
export const SchemaConfig = Vts.object({
    project: SchemaConfigProject,
    editor: Vts.optional(Vts.null()),
    server: Vts.optional(SchemaConfigServer)
});

/**
 * Type of Config
 */
export type Config = ExtractSchemaResultType<typeof SchemaConfig>;