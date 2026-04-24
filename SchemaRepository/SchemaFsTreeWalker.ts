import {
    JsonDataFS,
    JsonEnumDescription,
    JsonEnumValueDescription,
    JsonLinkDescription,
    JsonSchemaDescription,
    JsonSchemaFieldDescription
} from '../SchemaEditor/JsonData.js';

/**
 * A JsonDataFS found in the tree with a reference to its parent container
 * and the index inside the parent's `entrys` array. For the root node
 * `parent` is `null` and `index` is `-1`.
 */
export type ContainerContext = {
    container: JsonDataFS;
    parent: JsonDataFS|null;
    index: number;
};

export type SchemaContext = {
    schema: JsonSchemaDescription;
    container: JsonDataFS;
    index: number;
};

export type EnumContext = {
    enumeration: JsonEnumDescription;
    container: JsonDataFS;
    index: number;
};

export type LinkContext = {
    link: JsonLinkDescription;
    container: JsonDataFS;
    index: number;
};

export type FieldContext = {
    field: JsonSchemaFieldDescription;
    schema: JsonSchemaDescription;
    index: number;
};

export type EnumValueContext = {
    value: JsonEnumValueDescription;
    enumeration: JsonEnumDescription;
    index: number;
};

/**
 * Lookup helpers for the recursive JsonDataFS tree. The tree stores child
 * containers in `entrys` (typed as `unknown[]`, but always JsonDataFS at
 * runtime) and leaf items in the sibling arrays `schemas`, `enums`, `links`.
 *
 * All `find…` methods walk depth-first and return the first match; unids are
 * expected to be unique per project so there is no ambiguity in practice.
 */
export class SchemaFsTreeWalker {

    public static entrys(node: JsonDataFS): JsonDataFS[] {
        return node.entrys as JsonDataFS[];
    }

    public static links(node: JsonDataFS): JsonLinkDescription[] {
        return node.links ?? [];
    }

    public static findContainer(fs: JsonDataFS, unid: string): ContainerContext|null {
        if (fs.unid === unid) {
            return {container: fs, parent: null, index: -1};
        }

        return this._findContainerRec(fs, unid);
    }

    private static _findContainerRec(parent: JsonDataFS, unid: string): ContainerContext|null {
        const entrys = this.entrys(parent);

        for (let i = 0; i < entrys.length; i++) {
            const child = entrys[i];

            if (child.unid === unid) {
                return {container: child, parent, index: i};
            }

            const sub = this._findContainerRec(child, unid);

            if (sub !== null) {
                return sub;
            }
        }

        return null;
    }

    public static findSchema(fs: JsonDataFS, unid: string): SchemaContext|null {
        return this._walk(fs, (node) => {
            const idx = node.schemas.findIndex((s) => s.unid === unid);

            if (idx >= 0) {
                return {schema: node.schemas[idx], container: node, index: idx};
            }

            return null;
        });
    }

    public static findEnum(fs: JsonDataFS, unid: string): EnumContext|null {
        return this._walk(fs, (node) => {
            const idx = node.enums.findIndex((e) => e.unid === unid);

            if (idx >= 0) {
                return {enumeration: node.enums[idx], container: node, index: idx};
            }

            return null;
        });
    }

    public static findLink(fs: JsonDataFS, unid: string): LinkContext|null {
        return this._walk(fs, (node) => {
            const links = this.links(node);
            const idx = links.findIndex((l) => l.unid === unid);

            if (idx >= 0) {
                return {link: links[idx], container: node, index: idx};
            }

            return null;
        });
    }

    public static findField(
        fs: JsonDataFS,
        schemaUnid: string,
        fieldUnid: string
    ): FieldContext|null {
        const schemaCtx = this.findSchema(fs, schemaUnid);

        if (schemaCtx === null) {
            return null;
        }

        const idx = schemaCtx.schema.fields.findIndex((f) => f.unid === fieldUnid);

        if (idx < 0) {
            return null;
        }

        return {field: schemaCtx.schema.fields[idx], schema: schemaCtx.schema, index: idx};
    }

    public static findEnumValue(
        fs: JsonDataFS,
        enumUnid: string,
        valueUnid: string
    ): EnumValueContext|null {
        const enumCtx = this.findEnum(fs, enumUnid);

        if (enumCtx === null) {
            return null;
        }

        const idx = enumCtx.enumeration.values.findIndex((v) => v.unid === valueUnid);

        if (idx < 0) {
            return null;
        }

        return {value: enumCtx.enumeration.values[idx], enumeration: enumCtx.enumeration, index: idx};
    }

    /**
     * Returns true when any item in the tree (container, schema, enum,
     * field, enum value, link) has the given unid. Used by the repo to
     * reject client-supplied unids that would collide with existing items.
     */
    public static unidExists(fs: JsonDataFS, unid: string): boolean {
        return this._walk(fs, (node) => {
            if (node.unid === unid) {
                return true as const;
            }

            for (const schema of node.schemas) {
                if (schema.unid === unid) {
                    return true as const;
                }

                for (const field of schema.fields) {
                    if (field.unid === unid) {
                        return true as const;
                    }
                }
            }

            for (const enumeration of node.enums) {
                if (enumeration.unid === unid) {
                    return true as const;
                }

                for (const value of enumeration.values) {
                    if (value.unid === unid) {
                        return true as const;
                    }
                }
            }

            for (const link of this.links(node)) {
                if (link.unid === unid) {
                    return true as const;
                }
            }

            return null;
        }) === true;
    }

    /**
     * Returns true when `ancestor` contains `descendant` anywhere below it
     * (or if they are the same). Used to reject moves that would create a
     * cycle by moving a container into itself or one of its children.
     */
    public static isDescendantOf(ancestor: JsonDataFS, descendantUnid: string): boolean {
        if (ancestor.unid === descendantUnid) {
            return true;
        }

        for (const child of this.entrys(ancestor)) {
            if (this.isDescendantOf(child, descendantUnid)) {
                return true;
            }
        }

        return false;
    }

    private static _walk<T>(node: JsonDataFS, visit: (n: JsonDataFS) => T|null): T|null {
        const here = visit(node);

        if (here !== null) {
            return here;
        }

        for (const child of this.entrys(node)) {
            const sub = this._walk(child, visit);

            if (sub !== null) {
                return sub;
            }
        }

        return null;
    }

}