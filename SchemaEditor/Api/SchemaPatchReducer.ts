import {SchemaFsTreeWalker} from '../../SchemaRepository/SchemaFsTreeWalker.js';
import {SchemaRepositoryEvent} from '../../SchemaRepository/SchemaRepositoryEventTypes.js';
import {JsonDataFS} from '../JsonData.js';

/**
 * Outcome of applying a single event.
 *
 * `applied` — tree was mutated.
 * `skipped` — event is not a tree mutation (`editor_settings` is caller-owned).
 * `resync` — target node for the patch could not be found; local state has
 *   drifted from the server and a full refetch is required.
 */
export type PatchApplyResult = 'applied'|'skipped'|'resync';

/**
 * Applies granular repository events to a {@link JsonDataFS} in-place.
 *
 * Intended consumer: browser SSE listener for edits originating from other
 * clients (MCP, a second browser tab, …). The owning client's own echoes
 * must be filtered out by `clientId` BEFORE calling apply — re-applying an
 * event the local tree already reflects would duplicate nodes.
 */
export class SchemaPatchReducer {

    public static apply(fs: JsonDataFS, event: SchemaRepositoryEvent): PatchApplyResult {
        switch (event.op) {
            case 'replace_fs': {
                // Replace every tracked field on the root node in-place so
                // existing references to `fs` remain valid. `unid` stays as
                // 'root'; the bulk payload is assumed to ship with the same.
                const next = event.payload.fs;
                fs.name = next.name;
                fs.type = next.type;
                fs.icon = next.icon;
                fs.istoggle = next.istoggle;
                fs.entrys = next.entrys;
                fs.schemas = next.schemas;
                fs.enums = next.enums;
                fs.links = next.links;
                return 'applied';
            }

            case 'editor_settings':
                return 'skipped';

            // Containers -------------------------------------------------------

            case 'container_create': {
                const parent = SchemaFsTreeWalker.findContainer(fs, event.payload.parentUnid);

                if (parent === null) {
                    return 'resync';
                }

                parent.container.entrys.push(event.payload.node);
                return 'applied';
            }

            case 'container_update': {
                const ctx = SchemaFsTreeWalker.findContainer(fs, event.payload.unid);

                if (ctx === null) {
                    return 'resync';
                }

                const {patch} = event.payload;

                if (patch.name !== undefined) ctx.container.name = patch.name;
                if (patch.icon !== undefined) ctx.container.icon = patch.icon;
                if (patch.istoggle !== undefined) ctx.container.istoggle = patch.istoggle;
                if (patch.type !== undefined) ctx.container.type = patch.type;

                return 'applied';
            }

            case 'container_delete': {
                const ctx = SchemaFsTreeWalker.findContainer(fs, event.payload.unid);

                if (ctx === null || ctx.parent === null) {
                    return 'resync';
                }

                ctx.parent.entrys.splice(ctx.index, 1);
                return 'applied';
            }

            case 'container_move': {
                const src = SchemaFsTreeWalker.findContainer(fs, event.payload.unid);

                if (src === null || src.parent === null) {
                    return 'resync';
                }

                const dst = SchemaFsTreeWalker.findContainer(fs, event.payload.toParentUnid);

                if (dst === null) {
                    return 'resync';
                }

                const [node] = src.parent.entrys.splice(src.index, 1);
                const insertAt = event.payload.index ?? dst.container.entrys.length;
                const clamped = Math.max(
                    0,
                    Math.min(insertAt, dst.container.entrys.length)
                );
                dst.container.entrys.splice(clamped, 0, node);
                return 'applied';
            }

            // Schemas ----------------------------------------------------------

            case 'schema_create': {
                const ctx = SchemaFsTreeWalker.findContainer(fs, event.payload.containerUnid);

                if (ctx === null) {
                    return 'resync';
                }

                ctx.container.schemas.push(event.payload.schema);
                return 'applied';
            }

            case 'schema_update': {
                const ctx = SchemaFsTreeWalker.findSchema(fs, event.payload.unid);

                if (ctx === null) {
                    return 'resync';
                }

                Object.assign(ctx.schema, event.payload.patch);
                return 'applied';
            }

            case 'schema_delete': {
                const ctx = SchemaFsTreeWalker.findSchema(fs, event.payload.unid);

                if (ctx === null) {
                    return 'resync';
                }

                ctx.container.schemas.splice(ctx.index, 1);
                return 'applied';
            }

            case 'schema_move': {
                const src = SchemaFsTreeWalker.findSchema(fs, event.payload.unid);

                if (src === null) {
                    return 'resync';
                }

                const dst = SchemaFsTreeWalker.findContainer(fs, event.payload.toContainerUnid);

                if (dst === null) {
                    return 'resync';
                }

                const [schema] = src.container.schemas.splice(src.index, 1);
                dst.container.schemas.push(schema);
                return 'applied';
            }

            // Fields -----------------------------------------------------------

            case 'field_create': {
                const ctx = SchemaFsTreeWalker.findSchema(fs, event.payload.schemaUnid);

                if (ctx === null) {
                    return 'resync';
                }

                const {field, index} = event.payload;
                const clamped = Math.max(0, Math.min(index, ctx.schema.fields.length));
                ctx.schema.fields.splice(clamped, 0, field);
                return 'applied';
            }

            case 'field_update': {
                const ctx = SchemaFsTreeWalker.findField(
                    fs,
                    event.payload.schemaUnid,
                    event.payload.fieldUnid
                );

                if (ctx === null) {
                    return 'resync';
                }

                Object.assign(ctx.field, event.payload.patch);
                return 'applied';
            }

            case 'field_delete': {
                const ctx = SchemaFsTreeWalker.findField(
                    fs,
                    event.payload.schemaUnid,
                    event.payload.fieldUnid
                );

                if (ctx === null) {
                    return 'resync';
                }

                ctx.schema.fields.splice(ctx.index, 1);
                return 'applied';
            }

            case 'field_reorder': {
                const ctx = SchemaFsTreeWalker.findSchema(fs, event.payload.schemaUnid);

                if (ctx === null) {
                    return 'resync';
                }

                ctx.schema.fields = this._reorderByUnid(
                    ctx.schema.fields,
                    event.payload.order,
                    (f) => f.unid ?? ''
                );
                return 'applied';
            }

            // Enums ------------------------------------------------------------

            case 'enum_create': {
                const ctx = SchemaFsTreeWalker.findContainer(fs, event.payload.containerUnid);

                if (ctx === null) {
                    return 'resync';
                }

                ctx.container.enums.push(event.payload.enumeration);
                return 'applied';
            }

            case 'enum_update': {
                const ctx = SchemaFsTreeWalker.findEnum(fs, event.payload.unid);

                if (ctx === null) {
                    return 'resync';
                }

                Object.assign(ctx.enumeration, event.payload.patch);
                return 'applied';
            }

            case 'enum_delete': {
                const ctx = SchemaFsTreeWalker.findEnum(fs, event.payload.unid);

                if (ctx === null) {
                    return 'resync';
                }

                ctx.container.enums.splice(ctx.index, 1);
                return 'applied';
            }

            case 'enum_move': {
                const src = SchemaFsTreeWalker.findEnum(fs, event.payload.unid);

                if (src === null) {
                    return 'resync';
                }

                const dst = SchemaFsTreeWalker.findContainer(fs, event.payload.toContainerUnid);

                if (dst === null) {
                    return 'resync';
                }

                const [enumeration] = src.container.enums.splice(src.index, 1);
                dst.container.enums.push(enumeration);
                return 'applied';
            }

            // Enum values ------------------------------------------------------

            case 'enum_value_create': {
                const ctx = SchemaFsTreeWalker.findEnum(fs, event.payload.enumUnid);

                if (ctx === null) {
                    return 'resync';
                }

                const {value, index} = event.payload;
                const clamped = Math.max(
                    0,
                    Math.min(index, ctx.enumeration.values.length)
                );
                ctx.enumeration.values.splice(clamped, 0, value);
                return 'applied';
            }

            case 'enum_value_update': {
                const ctx = SchemaFsTreeWalker.findEnumValue(
                    fs,
                    event.payload.enumUnid,
                    event.payload.valueUnid
                );

                if (ctx === null) {
                    return 'resync';
                }

                Object.assign(ctx.value, event.payload.patch);
                return 'applied';
            }

            case 'enum_value_delete': {
                const ctx = SchemaFsTreeWalker.findEnumValue(
                    fs,
                    event.payload.enumUnid,
                    event.payload.valueUnid
                );

                if (ctx === null) {
                    return 'resync';
                }

                ctx.enumeration.values.splice(ctx.index, 1);
                return 'applied';
            }

            case 'enum_value_reorder': {
                const ctx = SchemaFsTreeWalker.findEnum(fs, event.payload.enumUnid);

                if (ctx === null) {
                    return 'resync';
                }

                ctx.enumeration.values = this._reorderByUnid(
                    ctx.enumeration.values,
                    event.payload.order,
                    (v) => v.unid
                );
                return 'applied';
            }

            // Links ------------------------------------------------------------

            case 'link_create': {
                const ctx = SchemaFsTreeWalker.findContainer(fs, event.payload.containerUnid);

                if (ctx === null) {
                    return 'resync';
                }

                if (!ctx.container.links) {
                    ctx.container.links = [];
                }

                ctx.container.links.push(event.payload.link);
                return 'applied';
            }

            case 'link_update': {
                const ctx = SchemaFsTreeWalker.findLink(fs, event.payload.unid);

                if (ctx === null) {
                    return 'resync';
                }

                if (event.payload.patch.pos !== undefined) {
                    ctx.link.pos = event.payload.patch.pos;
                }

                return 'applied';
            }

            case 'link_delete': {
                const ctx = SchemaFsTreeWalker.findLink(fs, event.payload.unid);

                if (ctx === null || !ctx.container.links) {
                    return 'resync';
                }

                ctx.container.links.splice(ctx.index, 1);
                return 'applied';
            }
        }
    }

    private static _reorderByUnid<T>(
        items: T[],
        order: string[],
        getUnid: (item: T) => string
    ): T[] {
        const byUnid = new Map<string, T>();

        for (const item of items) {
            byUnid.set(getUnid(item), item);
        }

        const result: T[] = [];
        const seen = new Set<string>();

        for (const unid of order) {
            const item = byUnid.get(unid);

            if (item !== undefined && !seen.has(unid)) {
                seen.add(unid);
                result.push(item);
            }
        }

        for (const item of items) {
            if (!seen.has(getUnid(item))) {
                result.push(item);
            }
        }

        return result;
    }

}