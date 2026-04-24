import {
    JsonSchemaDescriptionExtend,
    JsonSchemaFieldDescription,
    JsonSchemaFieldTypeArray,
    JsonSchemaPositionDescription
} from '../JsonData.js';

/**
 * Descriptor attached to `EditorEvents.updateData.detail.apiCall`. A
 * callsite that has migrated off the bulk save path populates this so the
 * central listener can forward the mutation to the granular `/api/projects/…`
 * endpoints instead of POSTing the whole tree.
 *
 * Unmigrated callsites omit it and fall through to the legacy
 * `SchemaEditor.saveData`.
 */
export type SchemaEditorApiCall =
    // Containers (folders / files)
    | {
        op: 'container_create';
        parentUnid: string;
        name: string;
        type: string;
        icon?: string;
        unid: string;
    }
    | {
        op: 'container_update';
        unid: string;
        patch: {name?: string; icon?: string; istoggle?: boolean; type?: string};
    }
    | {op: 'container_delete'; unid: string}
    | {
        op: 'container_move';
        unid: string;
        toParentUnid: string;
        index?: number;
    }

    // Schemas
    | {
        op: 'schema_create';
        containerUnid: string;
        name: string;
        description?: string;
        extend?: JsonSchemaDescriptionExtend;
        pos?: JsonSchemaPositionDescription;
        unid: string;
    }
    | {
        op: 'schema_update';
        unid: string;
        patch: {
            name?: string;
            description?: string;
            extend?: JsonSchemaDescriptionExtend;
            pos?: JsonSchemaPositionDescription;
        };
    }
    | {op: 'schema_delete'; unid: string}
    | {op: 'schema_move'; unid: string; toContainerUnid: string}

    // Fields (inside a schema)
    | {
        op: 'field_create';
        schemaUnid: string;
        name: string;
        type: JsonSchemaFieldDescription['type'];
        optional?: boolean;
        array?: boolean;
        types?: JsonSchemaFieldTypeArray;
        description?: string;
        index?: number;
        unid: string;
    }
    | {
        op: 'field_update';
        schemaUnid: string;
        fieldUnid: string;
        patch: {
            name?: string;
            type?: JsonSchemaFieldDescription['type'];
            optional?: boolean;
            array?: boolean;
            types?: JsonSchemaFieldTypeArray;
            description?: string;
        };
    }
    | {op: 'field_delete'; schemaUnid: string; fieldUnid: string}
    | {op: 'field_reorder'; schemaUnid: string; order: string[]}

    // Enums
    | {
        op: 'enum_update';
        unid: string;
        patch: {
            name?: string;
            description?: string;
            pos?: JsonSchemaPositionDescription;
        };
    }
    | {op: 'enum_delete'; unid: string}
    | {op: 'enum_move'; unid: string; toContainerUnid: string}

    // Enum values (inside an enum)
    | {
        op: 'enum_value_create';
        enumUnid: string;
        name: string;
        value: string;
        index?: number;
        unid: string;
    }
    | {
        op: 'enum_value_update';
        enumUnid: string;
        valueUnid: string;
        patch: {name?: string; value?: string};
    }
    | {op: 'enum_value_delete'; enumUnid: string; valueUnid: string}
    | {op: 'enum_value_reorder'; enumUnid: string; order: string[]}

    // Links
    | {
        op: 'link_create';
        containerUnid: string;
        link_unid: string;
        unid: string;
        pos?: JsonSchemaPositionDescription;
    }
    | {
        op: 'link_update';
        unid: string;
        patch: {pos?: JsonSchemaPositionDescription};
    }
    | {op: 'link_delete'; unid: string};

/**
 * Shape carried by `EditorEvents.updateData.detail`. Existing fields
 * remain backward-compatible with un-migrated callsites.
 */
export type SchemaEditorUpdateDataDetail = {
    updateView?: boolean;
    updateTreeView?: boolean;
    apiCall?: SchemaEditorApiCall;
};