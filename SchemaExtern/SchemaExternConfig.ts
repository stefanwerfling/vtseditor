import {Vts,ExtractSchemaResultType} from 'vts';

/**
 * Extern config
 */
export const SchemaExternConfig = Vts.object({
    schemaFiles: Vts.array(Vts.string()),
});

export type ExternConfig = ExtractSchemaResultType<typeof SchemaExternConfig>;

/**
 * Schema package extend
 */
export const SchemaPackageExtend = Vts.object({
    name: Vts.string(),
    vtseditor: SchemaExternConfig
}, {
    objectSchema: {
        ignoreAdditionalItems: true
    }
})

export type PackageExtend = ExtractSchemaResultType<typeof SchemaPackageExtend>;