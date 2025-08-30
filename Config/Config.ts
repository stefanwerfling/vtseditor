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
 * Schema config projekt scripts script
 */
export const SchemaConfigProjectScriptsScript = Vts.object({
    script: Vts.string(),
    path: Vts.string()
});

/**
 * Type config project scripts script
 */
export type ConfigProjectScriptsScript = ExtractSchemaResultType<typeof SchemaConfigProjectScriptsScript>;

/**
 * Schema config project scripts
 */
export const SchemaConfigProjectScripts = Vts.object({
    before_generate: Vts.optional(Vts.array(SchemaConfigProjectScriptsScript)),
    after_generate: Vts.optional(Vts.array(SchemaConfigProjectScriptsScript))
});

/**
 * Schema config project
 */
export const SchemaConfigProject = Vts.object({
    name: Vts.optional(Vts.string()),
    schemaPath: Vts.string(),
    code: Vts.optional(SchemaConfigProjectCode),
    scripts: Vts.optional(SchemaConfigProjectScripts),
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
 * Config provider name
 */
export enum ConfigProviderName {
    gemini = 'gemini',
    localai = 'localai',
    openai = 'openai'
}

/**
 * Schema config provider
 */
export const SchemaConfigProvider = Vts.object({
    apiProvider: Vts.or([Vts.enum(ConfigProviderName), Vts.string()]),
    apiKey: Vts.string(),
    apiUrl: Vts.string(),
    model: Vts.optional(Vts.string())
});

/**
 * Config provider
 */
export type ConfigProvider = ExtractSchemaResultType<typeof SchemaConfigProvider>;

/**
 * Schema config editor
 */
export const SchemaConfigEditor = Vts.object({
    providers: Vts.array(SchemaConfigProvider)
});

/**
 * Schema of Config
 */
export const SchemaConfig = Vts.object({
    projects: Vts.array(SchemaConfigProject),
    editor: Vts.optional(SchemaConfigEditor),
    server: Vts.optional(SchemaConfigServer),
    browser: Vts.optional(SchemaConfigBrowser)
});

/**
 * Type of Config
 */
export type Config = ExtractSchemaResultType<typeof SchemaConfig>;