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
    name: Vts.optional(Vts.string()),
    schemaPath: Vts.string(),
    code: Vts.optional(SchemaConfigProjectCode),
    autoGenerate: Vts.optional(Vts.boolean()),
    destinationPath: Vts.optional(Vts.string()),
    destinationClear: Vts.optional(Vts.boolean()),
});

/**
 * Schema of config server
 */
export const SchemaConfigServer = Vts.object({
    port: Vts.number()
});

/**
 * Schema of config browser
 */
export const SchemaConfigBrowser = Vts.object({
    open: Vts.boolean()
});

/**
 * Schema of Config
 */
export const SchemaConfig = Vts.object({
    projects: Vts.array(SchemaConfigProject),
    editor: Vts.optional(Vts.null()),
    server: Vts.optional(SchemaConfigServer),
    browser: Vts.optional(SchemaConfigBrowser)
});

/**
 * Type of Config
 */
export type Config = ExtractSchemaResultType<typeof SchemaConfig>;