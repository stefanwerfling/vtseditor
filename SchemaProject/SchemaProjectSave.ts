import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaProjectsData} from './SchemaProjectsResponse.js';

/**
 * Schema project save
 */
export const SchemaProjectSave = Vts.object({
    data: SchemaProjectsData
});

/**
 * Project save
 */
export type ProjectSave = ExtractSchemaResultType<typeof SchemaProjectSave>;