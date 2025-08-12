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

export const SchemaProjectsData = Vts.object({
    projects: Vts.array(SchemaProject),
    extern: Vts.array(SchemaExtern),
    editor: Vts.or([SchemaJsonEditorSettings, Vts.null()])
});

/**
 * Projects data
 */
export type ProjectsData = ExtractSchemaResultType<typeof SchemaProjectsData>;

export const SchemaProjectsResponse = Vts.object({
   data: SchemaProjectsData
});

/**
 * Projects response
 */
export type ProjectsResponse = ExtractSchemaResultType<typeof SchemaProjectsResponse>;