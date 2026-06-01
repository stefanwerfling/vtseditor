import {
    JsonDataFS,
    JsonEnumDescription,
    JsonSchemaDescription,
    SchemaJsonDataFS
} from '../SchemaEditor/JsonData.js';

/**
 * Strip a {@link JsonDataFS} of everything the editor does not need to render
 * the tree and populate the type registry on startup: per-schema fields and
 * extend, per-enum values, link descriptions, pos, and free-text descriptions.
 *
 * The returned object is still structurally a {@link JsonDataFS} (passes
 * {@link SchemaJsonDataFS.validate}) so the existing frontend code paths that
 * consume it stay type-correct. The heavy per-item arrays are emptied, not
 * removed; per-item identifiers (`unid`, `name`) remain so the treeview can
 * render schema/enum leaves and the type registry can resolve names.
 */
export function buildJsonDataFSSkeleton(node: JsonDataFS): JsonDataFS {
    const schemas: JsonSchemaDescription[] = node.schemas.map((s) => ({
        unid: s.unid,
        name: s.name,
        extend: {type: 'object'},
        pos: {x: 0, y: 0},
        fields: [],
        description: ''
    }));

    const enums: JsonEnumDescription[] = node.enums.map((e) => ({
        unid: e.unid,
        name: e.name,
        pos: {x: 0, y: 0},
        values: [],
        description: ''
    }));

    const entrys: JsonDataFS[] = [];

    for (const child of node.entrys as JsonDataFS[]) {
        entrys.push(buildJsonDataFSSkeleton(child));
    }

    const skeleton: JsonDataFS = {
        unid: node.unid,
        name: node.name,
        type: node.type,
        entrys,
        schemas,
        enums
    };

    if (node.icon !== undefined) {
        skeleton.icon = node.icon;
    }

    if (node.istoggle !== undefined) {
        skeleton.istoggle = node.istoggle;
    }

    return skeleton;
}