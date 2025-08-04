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

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json schema field type
 */
export const SchemaJsonSchemaFieldType = Vts.object({
    type: Vts.string(),
    optional: Vts.boolean(),
    array: Vts.boolean(),
    types: Vts.array(Vts.unknown()) // see JsonSchemaFieldTypeArray
});

/**
 * Type json schema field type
 */
export type JsonSchemaFieldType = ExtractSchemaResultType<typeof SchemaJsonSchemaFieldType>;

export const SchemaJsonSchemaFieldTypeArray = Vts.array(SchemaJsonSchemaFieldType);

export type JsonSchemaFieldTypeArray = ExtractSchemaResultType<typeof SchemaJsonSchemaFieldTypeArray>;


// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json schema field description
 */
export const SchemaJsonSchemaFieldDescription = Vts.object({
    unid: Vts.or([Vts.string(), Vts.null()]),
    name: Vts.string(),
    type: Vts.or([Vts.string(), SchemaJsonSchemaFieldType]),
    description: Vts.string()
}, {
    objectSchema: {
        ignoreAdditionalItems: true
    }
});

/**
 * Type json schema field description
 */
export type JsonSchemaFieldDescription = ExtractSchemaResultType<typeof SchemaJsonSchemaFieldDescription>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json schema position description
 */
export const SchemaJsonSchemaPositionDescription = Vts.object({
    x: Vts.number(),
    y: Vts.number()
})

/**
 * Type of schema position description
 */
export type JsonSchemaPositionDescription = ExtractSchemaResultType<typeof SchemaJsonSchemaPositionDescription>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json schema description option
 */
export const SchemaJsonSchemaDescriptionOption = Vts.object({
    ignore_additional_items: Vts.optional(Vts.boolean())
});

/**
 * Type of schema json schema description option
 */
export type JsonSchemaDescriptionOption = ExtractSchemaResultType<typeof SchemaJsonSchemaDescriptionOption>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json schema description
 */
export const SchemaJsonSchemaDescription = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    extend: Vts.string(),
    values_schema: Vts.optional(Vts.string()),
    options: Vts.optional(SchemaJsonSchemaDescriptionOption),
    pos: SchemaJsonSchemaPositionDescription,
    fields: Vts.array(SchemaJsonSchemaFieldDescription),
    description: Vts.string()
});

/**
 * Type of schema json schema description
 */
export type JsonSchemaDescription = ExtractSchemaResultType<typeof SchemaJsonSchemaDescription>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json enum value description
 */
export const SchemaJsonEnumValueDescription = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    value: Vts.string()
});

/**
 * Type of json enum value description
 */
export type JsonEnumValueDescription = ExtractSchemaResultType<typeof SchemaJsonEnumValueDescription>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json enum description
 */
export const SchemaJsonEnumDescription = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    pos: SchemaJsonSchemaPositionDescription,
    values: Vts.array(SchemaJsonEnumValueDescription),
    description: Vts.string()
}) ;

/**
 * Type schema json enum description
 */
export type JsonEnumDescription = ExtractSchemaResultType<typeof SchemaJsonEnumDescription>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json data FS
 */
export const SchemaJsonDataFS = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    type: Vts.or([Vts.enum(SchemaJsonDataFSType), Vts.string()]),
    icon: Vts.optional(Vts.or([Vts.enum(SchemaJsonDataFSIcon), Vts.string()])),
    istoggle: Vts.optional(Vts.boolean()),
    entrys: Vts.array(Vts.unknown()),
    schemas: Vts.array(SchemaJsonSchemaDescription),
    enums: Vts.array(SchemaJsonEnumDescription)
});

/**
 * Type json data FS
 */
export type JsonDataFS = ExtractSchemaResultType<typeof SchemaJsonDataFS>;

// ---------------------------------------------------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------------------------------------------------

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