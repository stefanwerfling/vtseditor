/**
 * Schema Project type
 */
export type SchemaProject = {
    name: string;
    schemaPath: string;
    schemaPrefix: string;
    createTypes: boolean;
    createIndex: boolean;
    autoGenerate: boolean;
    destinationPath: string;
    destinationClear: boolean;
    codeComment: boolean;
    codeIndent: string;
    scripts_before_generate: {
        script: string;
        path: string;
    }[];
    scripts_after_generate: {
        script: string;
        path: string;
    }[];
};