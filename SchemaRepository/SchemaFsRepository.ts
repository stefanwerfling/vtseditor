import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import {
    JsonData,
    JsonDataFS,
    JsonEditorSettings,
    JsonEnumDescription,
    JsonEnumValueDescription,
    JsonLinkDescription,
    JsonSchemaDescription,
    JsonSchemaDescriptionExtend,
    JsonSchemaFieldDescription,
    JsonSchemaFieldTypeArray,
    JsonSchemaPositionDescription,
    SchemaJsonData
} from '../SchemaEditor/JsonData.js';
import {SchemaProject} from '../SchemaProject/SchemaProject.js';
import {SchemaFsTreeWalker} from './SchemaFsTreeWalker.js';
import {
    SchemaRepositoryEvent,
    SchemaRepositoryEventBody,
    SchemaRepositoryEventBus
} from './SchemaRepositoryEventBus.js';
import {
    RepoConflictError,
    RepoInvalidError,
    RepoNotFoundError
} from './SchemaRepositoryErrors.js';

const DEFAULT_EDITOR_SETTINGS: JsonEditorSettings = {
    controls_width: 300
};

function makeEmptyFs(): JsonDataFS {
    return {
        unid: 'root',
        name: 'root',
        istoggle: true,
        icon: 'root',
        type: 'root',
        entrys: [],
        schemas: [],
        enums: []
    };
}

function defaultPos(): JsonSchemaPositionDescription {
    return {x: 0, y: 0};
}

function defaultExtend(): JsonSchemaDescriptionExtend {
    return {type: 'object'};
}

/**
 * Per-project in-memory owner of the schema tree.
 *
 * Holds the authoritative {@link JsonDataFS} for one project, loads and
 * persists it to `project.schemaPath`, and debounces writes so bursts of
 * granular mutations collapse into a single atomic file write (tmp + rename).
 *
 * Every mutation commits through {@link _commit}: `_rev` is incremented, a
 * debounced flush is scheduled, and — if a bus is wired — an event is
 * published so SSE subscribers get the patch.
 */
export class SchemaFsRepository {

    private readonly _project: SchemaProject;
    private readonly _bus: SchemaRepositoryEventBus|null;
    private _fs: JsonDataFS = makeEmptyFs();
    private _editor: JsonEditorSettings = {...DEFAULT_EDITOR_SETTINGS};
    private _rev = 0;
    private _flushTimer: ReturnType<typeof setTimeout>|null = null;
    private _flushPending = false;
    private _flushInFlight: Promise<void>|null = null;
    private _postFlush: (() => void|Promise<void>)|null = null;
    private readonly _flushDebounceMs: number;
    /**
     * True when at least one schema-content commit (anything except
     * `editor_settings`) has happened since the last flush. The post-flush
     * hook (codegen) only fires when this is true — pure UI-state flushes
     * like changing the active selection persist to disk but do not
     * regenerate `.ts` files or run pre/post scripts.
     */
    private _schemaDirtySinceFlush = false;

    public constructor(
        project: SchemaProject,
        bus: SchemaRepositoryEventBus|null = null,
        flushDebounceMs = 150
    ) {
        this._project = project;
        this._bus = bus;
        this._flushDebounceMs = flushDebounceMs;
    }

    public getProject(): SchemaProject {
        return this._project;
    }

    public getFs(): JsonDataFS {
        return this._fs;
    }

    public getEditorSettings(): JsonEditorSettings {
        return this._editor;
    }

    public getRev(): number {
        return this._rev;
    }

    /**
     * Register a callback that fires (fire-and-forget) after a successful
     * atomic write that included at least one schema-content change.
     * Editor-settings-only flushes (selection / UI state persistence) are
     * skipped so `autoGenerate` does not retrigger `npm run compile` on
     * every click. Pass `null` to clear.
     */
    public setPostFlushHook(hook: (() => void|Promise<void>)|null): void {
        this._postFlush = hook;
    }

    /**
     * Read `project.schemaPath` into memory. Missing file -> empty tree. An
     * existing but structurally invalid file logs a warning and falls back to
     * the empty tree (matches the prior silent behavior of /api/load-schema).
     */
    public load(): void {
        if (!fs.existsSync(this._project.schemaPath)) {
            this._fs = makeEmptyFs();
            this._editor = {...DEFAULT_EDITOR_SETTINGS};
            return;
        }

        try {
            const content = fs.readFileSync(this._project.schemaPath, 'utf-8');
            const parsed = JSON.parse(content);

            if (SchemaJsonData.validate(parsed, [])) {
                this._fs = parsed.fs;
                this._editor = parsed.editor;
                return;
            }

            console.warn(
                `SchemaFsRepository: invalid schema file at ${this._project.schemaPath}, using empty state`
            );
        } catch (e) {
            console.warn(
                `SchemaFsRepository: failed to read ${this._project.schemaPath}: ${(e as Error).message}`
            );
        }

        this._fs = makeEmptyFs();
        this._editor = {...DEFAULT_EDITOR_SETTINGS};
    }

    // -----------------------------------------------------------------------
    // Editor settings (global, not tree-scoped)
    // -----------------------------------------------------------------------

    public setEditorSettings(settings: JsonEditorSettings, clientId?: string): void {
        this._editor = settings;
        this._commit({op: 'editor_settings', payload: this._editor}, clientId);
    }

    // -----------------------------------------------------------------------
    // Containers (folders / files)
    // -----------------------------------------------------------------------

    public createContainer(
        args: {parentUnid: string; name: string; type: string; icon?: string; unid?: string},
        clientId?: string
    ): JsonDataFS {
        this._requireName(args.name);

        const parentCtx = SchemaFsTreeWalker.findContainer(this._fs, args.parentUnid);

        if (parentCtx === null) {
            throw new RepoNotFoundError(`container ${args.parentUnid}`);
        }

        const node: JsonDataFS = {
            unid: this._mintUnid(args.unid),
            name: args.name,
            type: args.type,
            icon: args.icon,
            istoggle: true,
            entrys: [],
            schemas: [],
            enums: [],
            links: []
        };

        parentCtx.container.entrys.push(node);

        this._commit({
            op: 'container_create',
            payload: {parentUnid: parentCtx.container.unid, node}
        }, clientId);

        return node;
    }

    public updateContainer(
        args: {
            unid: string;
            patch: {name?: string; icon?: string; istoggle?: boolean; type?: string};
        },
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findContainer(this._fs, args.unid);

        if (ctx === null) {
            throw new RepoNotFoundError(`container ${args.unid}`);
        }

        const {patch} = args;

        if (patch.name !== undefined) {
            this._requireName(patch.name);
            ctx.container.name = patch.name;
        }

        if (patch.icon !== undefined) {
            ctx.container.icon = patch.icon;
        }

        if (patch.istoggle !== undefined) {
            ctx.container.istoggle = patch.istoggle;
        }

        if (patch.type !== undefined) {
            ctx.container.type = patch.type;
        }

        this._commit({
            op: 'container_update',
            payload: {unid: args.unid, patch}
        }, clientId);
    }

    public deleteContainer(args: {unid: string}, clientId?: string): void {
        if (args.unid === this._fs.unid) {
            throw new RepoInvalidError('cannot delete root');
        }

        const ctx = SchemaFsTreeWalker.findContainer(this._fs, args.unid);

        if (ctx === null || ctx.parent === null) {
            throw new RepoNotFoundError(`container ${args.unid}`);
        }

        ctx.parent.entrys.splice(ctx.index, 1);

        this._commit({
            op: 'container_delete',
            payload: {unid: args.unid, parentUnid: ctx.parent.unid}
        }, clientId);
    }

    public moveContainer(
        args: {unid: string; toParentUnid: string; index?: number},
        clientId?: string
    ): void {
        if (args.unid === args.toParentUnid) {
            throw new RepoInvalidError('cannot move container into itself');
        }

        const src = SchemaFsTreeWalker.findContainer(this._fs, args.unid);

        if (src === null || src.parent === null) {
            throw new RepoNotFoundError(`container ${args.unid}`);
        }

        const dst = SchemaFsTreeWalker.findContainer(this._fs, args.toParentUnid);

        if (dst === null) {
            throw new RepoNotFoundError(`container ${args.toParentUnid}`);
        }

        if (SchemaFsTreeWalker.isDescendantOf(src.container, args.toParentUnid)) {
            throw new RepoInvalidError('cannot move container into one of its descendants');
        }

        const fromParent = src.parent;
        const [node] = fromParent.entrys.splice(src.index, 1);
        const insertAt = args.index ?? dst.container.entrys.length;
        const clamped = Math.max(0, Math.min(insertAt, dst.container.entrys.length));

        dst.container.entrys.splice(clamped, 0, node);

        this._commit({
            op: 'container_move',
            payload: {
                unid: args.unid,
                fromParentUnid: fromParent.unid,
                toParentUnid: dst.container.unid,
                index: clamped
            }
        }, clientId);
    }

    // -----------------------------------------------------------------------
    // Schemas
    // -----------------------------------------------------------------------

    public createSchema(
        args: {
            containerUnid: string;
            name: string;
            description?: string;
            extend?: JsonSchemaDescriptionExtend;
            pos?: JsonSchemaPositionDescription;
            unid?: string;
        },
        clientId?: string
    ): JsonSchemaDescription {
        this._requireName(args.name);

        const ctx = SchemaFsTreeWalker.findContainer(this._fs, args.containerUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`container ${args.containerUnid}`);
        }

        const schema: JsonSchemaDescription = {
            unid: this._mintUnid(args.unid),
            name: args.name,
            description: args.description ?? '',
            extend: args.extend ?? defaultExtend(),
            pos: args.pos ?? defaultPos(),
            fields: []
        };

        ctx.container.schemas.push(schema);

        this._commit({
            op: 'schema_create',
            payload: {containerUnid: ctx.container.unid, schema}
        }, clientId);

        return schema;
    }

    public updateSchema(
        args: {unid: string; patch: Partial<JsonSchemaDescription>},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findSchema(this._fs, args.unid);

        if (ctx === null) {
            throw new RepoNotFoundError(`schema ${args.unid}`);
        }

        const patch = {...args.patch};

        // unid/fields are not mutated through this path; use dedicated
        // methods for field changes and never reassign unid.
        delete patch.unid;
        delete patch.fields;

        if (patch.name !== undefined) {
            this._requireName(patch.name);
        }

        Object.assign(ctx.schema, patch);

        this._commit({
            op: 'schema_update',
            payload: {unid: args.unid, patch}
        }, clientId);
    }

    public deleteSchema(args: {unid: string}, clientId?: string): void {
        const ctx = SchemaFsTreeWalker.findSchema(this._fs, args.unid);

        if (ctx === null) {
            throw new RepoNotFoundError(`schema ${args.unid}`);
        }

        ctx.container.schemas.splice(ctx.index, 1);

        this._commit({
            op: 'schema_delete',
            payload: {unid: args.unid, containerUnid: ctx.container.unid}
        }, clientId);
    }

    public moveSchema(
        args: {unid: string; toContainerUnid: string},
        clientId?: string
    ): void {
        const src = SchemaFsTreeWalker.findSchema(this._fs, args.unid);

        if (src === null) {
            throw new RepoNotFoundError(`schema ${args.unid}`);
        }

        const dst = SchemaFsTreeWalker.findContainer(this._fs, args.toContainerUnid);

        if (dst === null) {
            throw new RepoNotFoundError(`container ${args.toContainerUnid}`);
        }

        if (src.container.unid === dst.container.unid) {
            return;
        }

        const [schema] = src.container.schemas.splice(src.index, 1);
        dst.container.schemas.push(schema);

        this._commit({
            op: 'schema_move',
            payload: {
                unid: args.unid,
                fromContainerUnid: src.container.unid,
                toContainerUnid: dst.container.unid
            }
        }, clientId);
    }

    // -----------------------------------------------------------------------
    // Fields (inside a schema)
    // -----------------------------------------------------------------------

    public createField(
        args: {
            schemaUnid: string;
            name: string;
            fieldType: JsonSchemaFieldDescription['type'];
            optional?: boolean;
            array?: boolean;
            types?: JsonSchemaFieldTypeArray;
            description?: string;
            index?: number;
            unid?: string;
        },
        clientId?: string
    ): JsonSchemaFieldDescription {
        this._requireName(args.name);

        const ctx = SchemaFsTreeWalker.findSchema(this._fs, args.schemaUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`schema ${args.schemaUnid}`);
        }

        const field: JsonSchemaFieldDescription = {
            unid: this._mintUnid(args.unid),
            name: args.name,
            type: args.fieldType,
            description: args.description ?? ''
        } as JsonSchemaFieldDescription;

        const extraFieldDefaults: Partial<JsonSchemaFieldDescription> = {};

        if (args.optional !== undefined) {
            (extraFieldDefaults as Record<string, unknown>).optional = args.optional;
        }

        if (args.array !== undefined) {
            (extraFieldDefaults as Record<string, unknown>).array = args.array;
        }

        if (args.types !== undefined) {
            (extraFieldDefaults as Record<string, unknown>).types = args.types;
        }

        Object.assign(field, extraFieldDefaults);

        const insertAt = args.index ?? ctx.schema.fields.length;
        const clamped = Math.max(0, Math.min(insertAt, ctx.schema.fields.length));

        ctx.schema.fields.splice(clamped, 0, field);

        this._commit({
            op: 'field_create',
            payload: {schemaUnid: args.schemaUnid, field, index: clamped}
        }, clientId);

        return field;
    }

    public updateField(
        args: {schemaUnid: string; fieldUnid: string; patch: Partial<JsonSchemaFieldDescription>},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findField(this._fs, args.schemaUnid, args.fieldUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`field ${args.fieldUnid} in schema ${args.schemaUnid}`);
        }

        const patch = {...args.patch};
        delete patch.unid;

        if (patch.name !== undefined) {
            this._requireName(patch.name);
        }

        Object.assign(ctx.field, patch);

        this._commit({
            op: 'field_update',
            payload: {schemaUnid: args.schemaUnid, fieldUnid: args.fieldUnid, patch}
        }, clientId);
    }

    public deleteField(
        args: {schemaUnid: string; fieldUnid: string},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findField(this._fs, args.schemaUnid, args.fieldUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`field ${args.fieldUnid} in schema ${args.schemaUnid}`);
        }

        ctx.schema.fields.splice(ctx.index, 1);

        this._commit({
            op: 'field_delete',
            payload: {schemaUnid: args.schemaUnid, fieldUnid: args.fieldUnid}
        }, clientId);
    }

    public reorderFields(
        args: {schemaUnid: string; order: string[]},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findSchema(this._fs, args.schemaUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`schema ${args.schemaUnid}`);
        }

        ctx.schema.fields = this._applyOrder(
            ctx.schema.fields,
            args.order,
            (f) => f.unid ?? '',
            'field'
        );

        this._commit({
            op: 'field_reorder',
            payload: {schemaUnid: args.schemaUnid, order: args.order}
        }, clientId);
    }

    // -----------------------------------------------------------------------
    // Enums
    // -----------------------------------------------------------------------

    public createEnum(
        args: {
            containerUnid: string;
            name: string;
            description?: string;
            pos?: JsonSchemaPositionDescription;
            unid?: string;
        },
        clientId?: string
    ): JsonEnumDescription {
        this._requireName(args.name);

        const ctx = SchemaFsTreeWalker.findContainer(this._fs, args.containerUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`container ${args.containerUnid}`);
        }

        const enumeration: JsonEnumDescription = {
            unid: this._mintUnid(args.unid),
            name: args.name,
            description: args.description ?? '',
            pos: args.pos ?? defaultPos(),
            values: []
        };

        ctx.container.enums.push(enumeration);

        this._commit({
            op: 'enum_create',
            payload: {containerUnid: ctx.container.unid, enumeration}
        }, clientId);

        return enumeration;
    }

    public updateEnum(
        args: {unid: string; patch: Partial<JsonEnumDescription>},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findEnum(this._fs, args.unid);

        if (ctx === null) {
            throw new RepoNotFoundError(`enum ${args.unid}`);
        }

        const patch = {...args.patch};
        delete patch.unid;
        delete patch.values;

        if (patch.name !== undefined) {
            this._requireName(patch.name);
        }

        Object.assign(ctx.enumeration, patch);

        this._commit({
            op: 'enum_update',
            payload: {unid: args.unid, patch}
        }, clientId);
    }

    public deleteEnum(args: {unid: string}, clientId?: string): void {
        const ctx = SchemaFsTreeWalker.findEnum(this._fs, args.unid);

        if (ctx === null) {
            throw new RepoNotFoundError(`enum ${args.unid}`);
        }

        ctx.container.enums.splice(ctx.index, 1);

        this._commit({
            op: 'enum_delete',
            payload: {unid: args.unid, containerUnid: ctx.container.unid}
        }, clientId);
    }

    public moveEnum(
        args: {unid: string; toContainerUnid: string},
        clientId?: string
    ): void {
        const src = SchemaFsTreeWalker.findEnum(this._fs, args.unid);

        if (src === null) {
            throw new RepoNotFoundError(`enum ${args.unid}`);
        }

        const dst = SchemaFsTreeWalker.findContainer(this._fs, args.toContainerUnid);

        if (dst === null) {
            throw new RepoNotFoundError(`container ${args.toContainerUnid}`);
        }

        if (src.container.unid === dst.container.unid) {
            return;
        }

        const [enumeration] = src.container.enums.splice(src.index, 1);
        dst.container.enums.push(enumeration);

        this._commit({
            op: 'enum_move',
            payload: {
                unid: args.unid,
                fromContainerUnid: src.container.unid,
                toContainerUnid: dst.container.unid
            }
        }, clientId);
    }

    // -----------------------------------------------------------------------
    // Enum values
    // -----------------------------------------------------------------------

    public createEnumValue(
        args: {enumUnid: string; name: string; value: string; index?: number; unid?: string},
        clientId?: string
    ): JsonEnumValueDescription {
        this._requireName(args.name);

        const ctx = SchemaFsTreeWalker.findEnum(this._fs, args.enumUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`enum ${args.enumUnid}`);
        }

        const value: JsonEnumValueDescription = {
            unid: this._mintUnid(args.unid),
            name: args.name,
            value: args.value
        };

        const insertAt = args.index ?? ctx.enumeration.values.length;
        const clamped = Math.max(0, Math.min(insertAt, ctx.enumeration.values.length));

        ctx.enumeration.values.splice(clamped, 0, value);

        this._commit({
            op: 'enum_value_create',
            payload: {enumUnid: args.enumUnid, value, index: clamped}
        }, clientId);

        return value;
    }

    public updateEnumValue(
        args: {enumUnid: string; valueUnid: string; patch: Partial<JsonEnumValueDescription>},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findEnumValue(this._fs, args.enumUnid, args.valueUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(
                `enum value ${args.valueUnid} in enum ${args.enumUnid}`
            );
        }

        const patch = {...args.patch};
        delete patch.unid;

        if (patch.name !== undefined) {
            this._requireName(patch.name);
        }

        Object.assign(ctx.value, patch);

        this._commit({
            op: 'enum_value_update',
            payload: {enumUnid: args.enumUnid, valueUnid: args.valueUnid, patch}
        }, clientId);
    }

    public deleteEnumValue(
        args: {enumUnid: string; valueUnid: string},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findEnumValue(this._fs, args.enumUnid, args.valueUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(
                `enum value ${args.valueUnid} in enum ${args.enumUnid}`
            );
        }

        ctx.enumeration.values.splice(ctx.index, 1);

        this._commit({
            op: 'enum_value_delete',
            payload: {enumUnid: args.enumUnid, valueUnid: args.valueUnid}
        }, clientId);
    }

    public reorderEnumValues(
        args: {enumUnid: string; order: string[]},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findEnum(this._fs, args.enumUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`enum ${args.enumUnid}`);
        }

        ctx.enumeration.values = this._applyOrder(
            ctx.enumeration.values,
            args.order,
            (v) => v.unid,
            'enum value'
        );

        this._commit({
            op: 'enum_value_reorder',
            payload: {enumUnid: args.enumUnid, order: args.order}
        }, clientId);
    }

    // -----------------------------------------------------------------------
    // Links
    // -----------------------------------------------------------------------

    public createLink(
        args: {
            containerUnid: string;
            link_unid: string;
            pos?: JsonSchemaPositionDescription;
            unid?: string;
        },
        clientId?: string
    ): JsonLinkDescription {
        const ctx = SchemaFsTreeWalker.findContainer(this._fs, args.containerUnid);

        if (ctx === null) {
            throw new RepoNotFoundError(`container ${args.containerUnid}`);
        }

        const link: JsonLinkDescription = {
            unid: this._mintUnid(args.unid),
            link_unid: args.link_unid,
            pos: args.pos ?? defaultPos()
        };

        if (!ctx.container.links) {
            ctx.container.links = [];
        }

        ctx.container.links.push(link);

        this._commit({
            op: 'link_create',
            payload: {containerUnid: ctx.container.unid, link}
        }, clientId);

        return link;
    }

    public updateLink(
        args: {unid: string; patch: {pos?: JsonSchemaPositionDescription}},
        clientId?: string
    ): void {
        const ctx = SchemaFsTreeWalker.findLink(this._fs, args.unid);

        if (ctx === null) {
            throw new RepoNotFoundError(`link ${args.unid}`);
        }

        if (args.patch.pos !== undefined) {
            ctx.link.pos = args.patch.pos;
        }

        this._commit({
            op: 'link_update',
            payload: {unid: args.unid, patch: args.patch}
        }, clientId);
    }

    public deleteLink(args: {unid: string}, clientId?: string): void {
        const ctx = SchemaFsTreeWalker.findLink(this._fs, args.unid);

        if (ctx === null) {
            throw new RepoNotFoundError(`link ${args.unid}`);
        }

        const links = ctx.container.links;

        if (!links) {
            throw new RepoNotFoundError(`link ${args.unid}`);
        }

        links.splice(ctx.index, 1);

        this._commit({
            op: 'link_delete',
            payload: {unid: args.unid, containerUnid: ctx.container.unid}
        }, clientId);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private _commit(body: SchemaRepositoryEventBody, clientId?: string): void {
        this._rev++;
        // Only content-bearing ops mark the repo dirty for codegen purposes —
        // `editor_settings` is pure UI state (active selection, panel widths)
        // and must not retrigger `npm run compile` on every click.
        if (body.op !== 'editor_settings') {
            this._schemaDirtySinceFlush = true;
        }
        this._scheduleFlush();

        if (!this._bus) {
            return;
        }

        const event = {
            ...body,
            rev: this._rev,
            ts: Date.now(),
            clientId
        } as SchemaRepositoryEvent;

        this._bus.publish(event);
    }

    private _requireName(name: string): void {
        if (name.length === 0) {
            throw new RepoInvalidError('name must be a non-empty string');
        }
    }

    /**
     * Returns a unid for a new item. If `clientUnid` is provided it is used
     * verbatim after uniqueness check, otherwise a fresh UUID is generated.
     *
     * Client-supplied unids enable the frontend's optimistic-update pattern:
     * the browser can mint a UUID, build the DOM immediately, and send the
     * same unid to the server so echoes from SSE land on the matching local
     * node.
     */
    private _mintUnid(clientUnid?: string): string {
        if (clientUnid === undefined) {
            return crypto.randomUUID();
        }

        if (clientUnid.length === 0) {
            throw new RepoInvalidError('unid must be a non-empty string');
        }

        if (SchemaFsTreeWalker.unidExists(this._fs, clientUnid)) {
            throw new RepoConflictError(`unid ${clientUnid} already exists`);
        }

        return clientUnid;
    }

    /**
     * Reorder an array so that entry unids match `order`. Missing entries in
     * `order` are kept at the end in their previous relative order. Unknown
     * unids raise {@link RepoConflictError}.
     */
    private _applyOrder<T>(
        items: T[],
        order: string[],
        getUnid: (item: T) => string,
        label: string
    ): T[] {
        const byUnid = new Map<string, T>();

        for (const item of items) {
            byUnid.set(getUnid(item), item);
        }

        const result: T[] = [];
        const seen = new Set<string>();

        for (const unid of order) {
            const item = byUnid.get(unid);

            if (item === undefined) {
                throw new RepoConflictError(`unknown ${label} ${unid} in reorder`);
            }

            if (seen.has(unid)) {
                throw new RepoConflictError(`duplicate ${label} ${unid} in reorder`);
            }

            seen.add(unid);
            result.push(item);
        }

        for (const item of items) {
            if (!seen.has(getUnid(item))) {
                result.push(item);
            }
        }

        return result;
    }

    private _scheduleFlush(): void {
        this._flushPending = true;

        if (this._flushTimer !== null) {
            return;
        }

        this._flushTimer = setTimeout(() => {
            this._flushTimer = null;
            void this.flush();
        }, this._flushDebounceMs);
    }

    /**
     * Persist pending changes to disk. Safe to call manually (e.g. before the
     * HTTP response returns, or on shutdown) — coalesces with any debounced
     * timer and with concurrent flush() calls.
     */
    public async flush(): Promise<void> {
        if (this._flushTimer !== null) {
            clearTimeout(this._flushTimer);
            this._flushTimer = null;
        }

        if (this._flushInFlight) {
            await this._flushInFlight;
        }

        if (!this._flushPending) {
            return;
        }

        this._flushPending = false;
        // Snapshot then reset before the write so any concurrent commit that
        // arrives while we're writing correctly re-arms the flag for the
        // next flush cycle.
        const runHook = this._schemaDirtySinceFlush;
        this._schemaDirtySinceFlush = false;

        const payload: JsonData = {
            fs: this._fs,
            editor: this._editor
        };

        this._flushInFlight = this._writeAtomic(payload).finally(() => {
            this._flushInFlight = null;
        });

        await this._flushInFlight;

        if (runHook && this._postFlush !== null) {
            try {
                await this._postFlush();
            } catch (e) {
                console.warn(
                    `SchemaFsRepository post-flush hook failed: ${(e as Error).message}`
                );
            }
        }
    }

    private async _writeAtomic(data: JsonData): Promise<void> {
        const target = this._project.schemaPath;
        const dir = path.dirname(target);
        const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;

        await fsp.mkdir(dir, {recursive: true});
        await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
        await fsp.rename(tmp, target);
    }

}