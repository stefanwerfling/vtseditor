import {
    JsonDataFS,
    JsonEditorSettings,
    JsonEnumDescription,
    JsonEnumValueDescription,
    JsonLinkDescription,
    JsonSchemaDescription,
    JsonSchemaFieldDescription,
    JsonSchemaPositionDescription
} from '../SchemaEditor/JsonData.js';

/**
 * Envelope fields shared by every repository event. `rev` is monotonically
 * increasing per project and is used as the SSE `id:` field so clients can
 * resume with `Last-Event-ID`. `clientId` is copied from the mutation request
 * so the originating client can recognize and ignore its own echoes.
 */
export type SchemaRepositoryEventEnvelope = {
    rev: number;
    ts: number;
    clientId?: string;
};

/**
 * Op-specific body of a repository event. Each granular op carries the
 * minimum information a client needs to apply a local patch without
 * refetching. `replace_fs` is the Phase-2 fallback still emitted by the
 * legacy /api/save-schema endpoint.
 */
export type SchemaRepositoryEventBody =
    | {op: 'replace_fs'; payload: {fs: JsonDataFS}}
    | {op: 'editor_settings'; payload: JsonEditorSettings}
    // containers (folders/files — the JsonDataFS node type is stored in `node.type`)
    | {op: 'container_create'; payload: {parentUnid: string; node: JsonDataFS}}
    | {op: 'container_update'; payload: {unid: string; patch: {name?: string; icon?: string; istoggle?: boolean; type?: string}}}
    | {op: 'container_delete'; payload: {unid: string; parentUnid: string}}
    | {op: 'container_move'; payload: {unid: string; fromParentUnid: string; toParentUnid: string; index?: number}}
    // schemas
    | {op: 'schema_create'; payload: {containerUnid: string; schema: JsonSchemaDescription}}
    | {op: 'schema_update'; payload: {unid: string; patch: Partial<JsonSchemaDescription>}}
    | {op: 'schema_delete'; payload: {unid: string; containerUnid: string}}
    | {op: 'schema_move'; payload: {unid: string; fromContainerUnid: string; toContainerUnid: string}}
    // fields (inside a schema)
    | {op: 'field_create'; payload: {schemaUnid: string; field: JsonSchemaFieldDescription; index: number}}
    | {op: 'field_update'; payload: {schemaUnid: string; fieldUnid: string; patch: Partial<JsonSchemaFieldDescription>}}
    | {op: 'field_delete'; payload: {schemaUnid: string; fieldUnid: string}}
    | {op: 'field_reorder'; payload: {schemaUnid: string; order: string[]}}
    // enums
    | {op: 'enum_create'; payload: {containerUnid: string; enumeration: JsonEnumDescription}}
    | {op: 'enum_update'; payload: {unid: string; patch: Partial<JsonEnumDescription>}}
    | {op: 'enum_delete'; payload: {unid: string; containerUnid: string}}
    | {op: 'enum_move'; payload: {unid: string; fromContainerUnid: string; toContainerUnid: string}}
    // enum values (inside an enum)
    | {op: 'enum_value_create'; payload: {enumUnid: string; value: JsonEnumValueDescription; index: number}}
    | {op: 'enum_value_update'; payload: {enumUnid: string; valueUnid: string; patch: Partial<JsonEnumValueDescription>}}
    | {op: 'enum_value_delete'; payload: {enumUnid: string; valueUnid: string}}
    | {op: 'enum_value_reorder'; payload: {enumUnid: string; order: string[]}}
    // links
    | {op: 'link_create'; payload: {containerUnid: string; link: JsonLinkDescription}}
    | {op: 'link_update'; payload: {unid: string; patch: {pos?: JsonSchemaPositionDescription}}}
    | {op: 'link_delete'; payload: {unid: string; containerUnid: string}};

export type SchemaRepositoryEvent = SchemaRepositoryEventEnvelope & SchemaRepositoryEventBody;

export type SchemaRepositoryEventOp = SchemaRepositoryEventBody['op'];

/**
 * Exhaustive list of op names. Clients that need to enumerate (e.g. to
 * register one SSE listener per op) should use this instead of maintaining
 * their own list.
 */
export const SCHEMA_REPOSITORY_EVENT_OPS: SchemaRepositoryEventOp[] = [
    'replace_fs',
    'editor_settings',
    'container_create',
    'container_update',
    'container_delete',
    'container_move',
    'schema_create',
    'schema_update',
    'schema_delete',
    'schema_move',
    'field_create',
    'field_update',
    'field_delete',
    'field_reorder',
    'enum_create',
    'enum_update',
    'enum_delete',
    'enum_move',
    'enum_value_create',
    'enum_value_update',
    'enum_value_delete',
    'enum_value_reorder',
    'link_create',
    'link_update',
    'link_delete'
];