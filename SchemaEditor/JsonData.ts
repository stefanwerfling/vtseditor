import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Treeview entry type
 */
export enum SchemaJsonDataFSType {
    root = 'root',
    extern = 'extern',
    project = 'project',
    folder = 'folder',
    file = 'file',
    schema = 'schema',
    enum = 'enum',
    link = 'link'
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
    ignore_additional_items: Vts.optional(Vts.boolean()),
    not_export: Vts.optional(Vts.boolean())
});

/**
 * Type of schema json schema description option
 */
export type JsonSchemaDescriptionOption = ExtractSchemaResultType<typeof SchemaJsonSchemaDescriptionOption>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json schema description extend value
 */
export const SchemaJsonSchemaDescriptionExtendValue = Vts.object({
    type: Vts.string(),
    value: Vts.optional(Vts.string()),
    // update to value
    values_schema: Vts.optional(Vts.string()),
});

/**
 * Type of schema json schema description extend value
 */
export type JsonSchemaDescriptionExtendValue = ExtractSchemaResultType<typeof SchemaJsonSchemaDescriptionExtendValue>;

/**
 * Schema json schema description extend
 */
export const SchemaJsonSchemaDescriptionExtend = SchemaJsonSchemaDescriptionExtendValue.extend({
    options: Vts.optional(SchemaJsonSchemaDescriptionOption),
    or_values: Vts.optional(Vts.array(SchemaJsonSchemaDescriptionExtendValue))
});

/**
 * Type of schema json schema description extend
 */
export type JsonSchemaDescriptionExtend = ExtractSchemaResultType<typeof SchemaJsonSchemaDescriptionExtend>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json schema description
 */
export const SchemaJsonSchemaDescription = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    extend: SchemaJsonSchemaDescriptionExtend,
    pos: SchemaJsonSchemaPositionDescription,
    fields: Vts.array(SchemaJsonSchemaFieldDescription),
    description: Vts.string()
}, {
    objectSchema: {
        ignoreAdditionalItems: true
    }
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
 * Schema json data link
 */
export const SchemaJsonLinkDescription = Vts.object({
    unid: Vts.string(),
    pos: SchemaJsonSchemaPositionDescription,
    link_unid: Vts.string()
});

/**
 * Type of schema json data link
 */
export type JsonLinkDescription = ExtractSchemaResultType<typeof SchemaJsonLinkDescription>;

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
    enums: Vts.array(SchemaJsonEnumDescription),
    links: Vts.optional(Vts.array(SchemaJsonLinkDescription))
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
    controls_width: Vts.number(),
    active_entry_unid: Vts.optional(Vts.string()),
    active_entry_table_unid: Vts.optional(Vts.string())
});

/**
 * Type json editor setting
 */
export type JsonEditorSettings = ExtractSchemaResultType<typeof SchemaJsonEditorSettings>;

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Schema json data.
 *
 * `version` distinguishes the on-disk layouts:
 *   - missing / `1`: legacy single-file. `fs` carries every file's
 *     schemas/enums/links inline.
 *   - `2`: chunked. `fs` is an index — file-type entries have empty
 *     `schemas`/`enums`/`links` arrays in the main file; their content
 *     lives in `entries/<unid>.json` next to the main file.
 */
export const SchemaJsonData = Vts.object({
    fs: SchemaJsonDataFS,
    editor: SchemaJsonEditorSettings,
    version: Vts.optional(Vts.number())
});

/**
 * Type json data
 */
export type JsonData = ExtractSchemaResultType<typeof SchemaJsonData>;

/**
 * Kind of the item a {@link SchemaJsonHistoryEntry} snapshots.
 */
export enum SchemaJsonHistoryKind {
    schema = 'schema',
    enum = 'enum'
}

/**
 * One historical snapshot of a schema or enum, persisted inline in the
 * chunk file. `snapshot` is the full pre-change `JsonSchemaDescription`
 * or `JsonEnumDescription`; we validate it shape-aware on restore so a
 * hand-edited chunk that drifted past the current `SchemaJsonSchema…`
 * shape can still be inspected here.
 */
export const SchemaJsonHistoryEntry = Vts.object({
    ts: Vts.number(),
    kind: Vts.or([Vts.enum(SchemaJsonHistoryKind), Vts.string()]),
    snapshot: Vts.unknown()
});

export type JsonHistoryEntry = ExtractSchemaResultType<typeof SchemaJsonHistoryEntry>;

/**
 * What changed in the save that followed this snapshot. Computed by
 * the server against the next-in-time snapshot (or the live state for
 * the most recent entry) and attached to the API response — never
 * persisted on disk.
 */
export type JsonHistoryChange = {
    /** Fields / enum values present after but not in this snapshot. */
    added: number;
    /** Fields / enum values present in this snapshot but gone after. */
    removed: number;
    /** Same unid, different content. */
    modified: number;
    /** Top-level fields (name, description, extend) changed. */
    topLevel: boolean;
};

export type JsonHistoryEntryWithChange = JsonHistoryEntry & {changes: JsonHistoryChange};

/**
 * Schema json entry chunk — the on-disk shape of one `entries/<unid>.json`
 * file. Mirrors the per-file payload of a {@link JsonDataFS} so the
 * load path can splice the chunk back into the corresponding file
 * node without further reshaping.
 *
 * `history` is an inline change log keyed by the schema/enum unid; each
 * entry is the previous version captured just before a flush rewrote it.
 * Capped per item by the repository at `editor.historySize` from
 * `vtseditor.json`. Optional so chunks written by older builds still
 * load.
 */
export const SchemaJsonEntryChunk = Vts.object({
    schemas: Vts.array(SchemaJsonSchemaDescription),
    enums: Vts.array(SchemaJsonEnumDescription),
    links: Vts.optional(Vts.array(SchemaJsonLinkDescription)),
    history: Vts.optional(Vts.object2(Vts.string(), Vts.array(SchemaJsonHistoryEntry)))
});

/**
 * Type of an entry chunk file.
 */
export type JsonEntryChunk = ExtractSchemaResultType<typeof SchemaJsonEntryChunk>;