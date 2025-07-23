import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Treeview entry type
 */
export enum SchemaJsonDataFSType {
    root = 'root',
    extern = 'extern',
    folder = 'folder',
    file = 'file',
    schema = 'schema',
    enum = 'enum'
}

/**
 * Treeveiw entry icon
 */
export enum SchemaJsonDataFSIcon {
    package = 'package',
    registry = 'registry',
    libary = 'libary',
    archiv = 'archiv'
}


export const SchemaJsonSchemaFieldDescription = Vts.object({
    unid: Vts.or([Vts.string(), Vts.null()]),
    name: Vts.string(),
    type: Vts.string(),
    subtypes: Vts.array(Vts.string()),
    optional: Vts.boolean(),
    description: Vts.string()
});

export type JsonSchemaFieldDescription = ExtractSchemaResultType<typeof SchemaJsonSchemaFieldDescription>;

export const SchemaJsonSchemaPositionDescription = Vts.object({
    x: Vts.number(),
    y: Vts.number()
})

export type JsonSchemaPositionDescription = ExtractSchemaResultType<typeof SchemaJsonSchemaPositionDescription>;

export const SchemaJsonSchemaDescription = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    extend: Vts.string(),
    pos: SchemaJsonSchemaPositionDescription,
    fields: Vts.array(SchemaJsonSchemaFieldDescription),
    description: Vts.string()
});

export type JsonSchemaDescription = ExtractSchemaResultType<typeof SchemaJsonSchemaDescription>;

export const SchemaJsonEnumValueDescription = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    value: Vts.string()
});

export type JsonEnumValueDescription = ExtractSchemaResultType<typeof SchemaJsonEnumValueDescription>;

export const SchemaJsonEnumDescription = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    pos: SchemaJsonSchemaPositionDescription,
    values: Vts.array(SchemaJsonEnumValueDescription),
    description: Vts.string()
}) ;

export type JsonEnumDescription = ExtractSchemaResultType<typeof SchemaJsonEnumDescription>;

/**
 * Schema json data FS
 */
export const SchemaJsonDataFS = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    type: Vts.or([Vts.enum(SchemaJsonDataFSType), Vts.string()]),
    icon: Vts.optional(Vts.or([Vts.enum(SchemaJsonDataFSIcon), Vts.string()])),
    entrys: Vts.array(Vts.unknown()),
    schemas: Vts.array(SchemaJsonSchemaDescription),
    enums: Vts.array(SchemaJsonEnumDescription)
});

/**
 * Type json data FS
 */
export type JsonDataFS = ExtractSchemaResultType<typeof SchemaJsonDataFS>;

/**
 * Schema json editor settings
 */
export const SchemaJsonEditorSettings = Vts.object({
    controls_width: Vts.number()
});

/**
 * Type json editor setting
 */
export type JsonEditorSettings = ExtractSchemaResultType<typeof SchemaJsonEditorSettings>;

/**
 * Schema json data
 */
export const SchemaJsonData = Vts.object({
    fs: SchemaJsonDataFS,
    editor: SchemaJsonEditorSettings
});

/**
 * Type json data
 */
export type JsonData = ExtractSchemaResultType<typeof SchemaJsonData>;