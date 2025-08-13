import {Vts,ExtractSchemaResultType} from 'vts';

/**
 * Schema extern export
 */
export const SchemaExternExport = Vts.object({
    schemaFile: Vts.string(),
    schemaPrefix: Vts.string()
});

/**
 * Extern config
 */
export const SchemaExternConfig = Vts.object({
    exports: Vts.array(SchemaExternExport),
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