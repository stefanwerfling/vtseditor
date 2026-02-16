import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaJsonDataFS, SchemaJsonEditorSettings} from '../SchemaEditor/JsonData.js';

export const SchemaProject = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    fs: SchemaJsonDataFS
});

export const SchemaExtern = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    fs: SchemaJsonDataFS
});

export const SchemaEditorInit = Vts.object({
    enable_schema_create: Vts.boolean()
});

/**
 * Editor init
 */
export type EditorInit = ExtractSchemaResultType<typeof SchemaEditorInit>;

/**
 * Schema projects data
 */
export const SchemaProjectsData = Vts.object({
    projects: Vts.array(SchemaProject),
    extern: Vts.array(SchemaExtern),
    editor: Vts.or([SchemaJsonEditorSettings, Vts.null()]),
    init: Vts.optional(SchemaEditorInit)
});

/**
 * Projects data
 */
export type ProjectsData = ExtractSchemaResultType<typeof SchemaProjectsData>;

/**
 * Schema project response
 */
export const SchemaProjectsResponse = Vts.object({
    data: SchemaProjectsData
});

/**
 * Projects response
 */
export type ProjectsResponse = ExtractSchemaResultType<typeof SchemaProjectsResponse>;