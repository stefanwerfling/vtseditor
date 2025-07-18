
/**
 * Treeview entry type
 */
export enum SchemaJsonDataFSType {
    root = 'root',
    folder = 'folder',
    file = 'file',
    schema = 'schema',
    enum = 'enum'
}

export type SchemaJsonSchemaFieldDescription = {
    uuid: string|null;
    name: string;
    type: string;
    subtypes: string[];
    optional: boolean;
    description: string;
};

export type SchemaJsonSchemaPositionDescription = {
    x: number;
    y: number;
};

export type SchemaJsonSchemaDescription = {
    id: string;
    name: string;
    extend: string;
    pos: SchemaJsonSchemaPositionDescription;
    fields: SchemaJsonSchemaFieldDescription[];
    description: string;
};

export type SchemaJsonEnumValueDescription = {
    uuid: string;
    name: string;
    value: string;
};

export type SchemaJsonEnumDescription = {
    id: string;
    name: string;
    pos: SchemaJsonSchemaPositionDescription;
    values: SchemaJsonEnumValueDescription[];
    description: string;
};

export type SchemaJsonDataFS = {
    id: string;
    name: string;
    type: SchemaJsonDataFSType|string
    entrys: SchemaJsonDataFS[];
    schemas: SchemaJsonSchemaDescription[];
    enums: SchemaJsonEnumDescription[];
};

export type SchemaJsonEditorSetting = {
    controls_width: number;
};

export type SchemaJsonData = {
    fs: SchemaJsonDataFS;
    editor: SchemaJsonEditorSetting
};