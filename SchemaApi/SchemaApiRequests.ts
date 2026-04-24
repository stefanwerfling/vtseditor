import {Vts} from 'vts';
import {
    SchemaJsonEditorSettings,
    SchemaJsonSchemaDescriptionExtend,
    SchemaJsonSchemaFieldType,
    SchemaJsonSchemaFieldTypeArray,
    SchemaJsonSchemaPositionDescription
} from '../SchemaEditor/JsonData.js';

/**
 * Request body validators for the granular schema API (Phase 3).
 *
 * Every mutation endpoint validates its body against one of these schemas
 * before calling into {@link SchemaFsRepository}. URL params (project unid,
 * item unid) arrive as strings from Express routing and are handed to the
 * repo directly.
 */

// Containers ------------------------------------------------------------------

export const ContainerCreateBody = Vts.object({
    parentUnid: Vts.string(),
    name: Vts.string(),
    type: Vts.string(),
    icon: Vts.optional(Vts.string()),
    unid: Vts.optional(Vts.string())
});

export const ContainerUpdateBody = Vts.object({
    patch: Vts.object({
        name: Vts.optional(Vts.string()),
        icon: Vts.optional(Vts.string()),
        istoggle: Vts.optional(Vts.boolean()),
        type: Vts.optional(Vts.string())
    })
});

export const ContainerMoveBody = Vts.object({
    toParentUnid: Vts.string(),
    index: Vts.optional(Vts.number())
});

// Schemas ---------------------------------------------------------------------

export const SchemaCreateBody = Vts.object({
    containerUnid: Vts.string(),
    name: Vts.string(),
    description: Vts.optional(Vts.string()),
    extend: Vts.optional(SchemaJsonSchemaDescriptionExtend),
    pos: Vts.optional(SchemaJsonSchemaPositionDescription),
    unid: Vts.optional(Vts.string())
});

export const SchemaUpdateBody = Vts.object({
    patch: Vts.object({
        name: Vts.optional(Vts.string()),
        description: Vts.optional(Vts.string()),
        extend: Vts.optional(SchemaJsonSchemaDescriptionExtend),
        pos: Vts.optional(SchemaJsonSchemaPositionDescription)
    })
});

export const SchemaMoveBody = Vts.object({
    toContainerUnid: Vts.string()
});

// Fields ----------------------------------------------------------------------

export const FieldCreateBody = Vts.object({
    name: Vts.string(),
    type: Vts.or([Vts.string(), SchemaJsonSchemaFieldType]),
    optional: Vts.optional(Vts.boolean()),
    array: Vts.optional(Vts.boolean()),
    types: Vts.optional(SchemaJsonSchemaFieldTypeArray),
    description: Vts.optional(Vts.string()),
    index: Vts.optional(Vts.number()),
    unid: Vts.optional(Vts.string())
});

export const FieldUpdateBody = Vts.object({
    patch: Vts.object({
        name: Vts.optional(Vts.string()),
        type: Vts.optional(Vts.or([Vts.string(), SchemaJsonSchemaFieldType])),
        optional: Vts.optional(Vts.boolean()),
        array: Vts.optional(Vts.boolean()),
        types: Vts.optional(SchemaJsonSchemaFieldTypeArray),
        description: Vts.optional(Vts.string())
    })
});

// Enums -----------------------------------------------------------------------

export const EnumCreateBody = Vts.object({
    containerUnid: Vts.string(),
    name: Vts.string(),
    description: Vts.optional(Vts.string()),
    pos: Vts.optional(SchemaJsonSchemaPositionDescription),
    unid: Vts.optional(Vts.string())
});

export const EnumUpdateBody = Vts.object({
    patch: Vts.object({
        name: Vts.optional(Vts.string()),
        description: Vts.optional(Vts.string()),
        pos: Vts.optional(SchemaJsonSchemaPositionDescription)
    })
});

export const EnumMoveBody = Vts.object({
    toContainerUnid: Vts.string()
});

// Enum values -----------------------------------------------------------------

export const EnumValueCreateBody = Vts.object({
    name: Vts.string(),
    value: Vts.string(),
    index: Vts.optional(Vts.number()),
    unid: Vts.optional(Vts.string())
});

export const EnumValueUpdateBody = Vts.object({
    patch: Vts.object({
        name: Vts.optional(Vts.string()),
        value: Vts.optional(Vts.string())
    })
});

// Shared ----------------------------------------------------------------------

export const OrderBody = Vts.object({
    order: Vts.array(Vts.string())
});

// Links -----------------------------------------------------------------------

export const LinkCreateBody = Vts.object({
    containerUnid: Vts.string(),
    link_unid: Vts.string(),
    pos: Vts.optional(SchemaJsonSchemaPositionDescription),
    unid: Vts.optional(Vts.string())
});

export const LinkUpdateBody = Vts.object({
    patch: Vts.object({
        pos: Vts.optional(SchemaJsonSchemaPositionDescription)
    })
});

// Editor settings -------------------------------------------------------------

export const EditorSettingsBody = SchemaJsonEditorSettings;

// Batch -----------------------------------------------------------------------

/**
 * Validator for {@link BatchBody}'s individual ops. Lets the op discriminator
 * and arbitrary payload fields through; each op's shape is checked inside
 * the batch route handler's switch.
 */
export const BatchOp = Vts.object({
    op: Vts.string()
}, {
    objectSchema: {
        ignoreAdditionalItems: true
    }
});

export const BatchBody = Vts.object({
    ops: Vts.array(BatchOp)
});