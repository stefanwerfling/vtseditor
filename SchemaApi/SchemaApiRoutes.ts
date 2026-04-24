import type {Express, Request, Response} from 'express';
import {SchemaErrors} from 'vts';
import {SchemaFsRepository} from '../SchemaRepository/SchemaFsRepository.js';
import {RepoError, RepoInvalidError} from '../SchemaRepository/SchemaRepositoryErrors.js';
import {SchemaRepositoryRegistry} from '../SchemaRepository/SchemaRepositoryRegistry.js';
import * as Req from './SchemaApiRequests.js';

/**
 * External dependencies the route handlers need — supplied by
 * `vite.config.ts` so this module stays free of extern-loader and code-gen
 * knowledge.
 */
export type SchemaApiContext = {
    repositories: SchemaRepositoryRegistry;

    /**
     * Called by `POST /api/projects/:pid/generate`. The registrar assumes the
     * repo has been flushed by the time this runs; the implementation
     * handles extern-source collection, pre/post scripts and the actual code
     * generation.
     */
    runGenerate: (repo: SchemaFsRepository) => Promise<void>;
};

/**
 * Attaches the granular Phase-3 API routes to `app`. Leaves the legacy
 * /api/save-schema and /api/save-editor-setting endpoints untouched — those
 * are removed in Phase 5 once the frontend has migrated.
 */
export function registerSchemaApiRoutes(app: Express, ctx: SchemaApiContext): void {
    const {repositories} = ctx;

    const clientIdOf = (req: Request): string|undefined => {
        const raw = req.header('X-Client-Id');
        return raw && raw.length > 0 ? raw : undefined;
    };

    const repoOf = (req: Request, res: Response): SchemaFsRepository|null => {
        const pid = req.params.pid;
        const repo = repositories.get(pid);

        if (!repo) {
            res.status(404).json({success: false, msg: `Unknown project ${pid}`});
            return null;
        }

        return repo;
    };

    const badBody = (res: Response): void => {
        res.status(400).json({success: false, msg: 'Bad request body'});
    };

    const handleError = (e: unknown, res: Response): void => {
        if (e instanceof RepoError) {
            res.status(e.httpStatus).json({success: false, msg: e.message, code: e.code});
            return;
        }

        console.error(e);
        res.status(500).json({success: false, msg: 'Internal error'});
    };

    const ok = (res: Response, repo: SchemaFsRepository, data?: unknown): void => {
        res.status(200).json({success: true, rev: repo.getRev(), data});
    };

    // Containers ---------------------------------------------------------------

    app.post('/api/projects/:pid/containers', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.ContainerCreateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            const node = repo.createContainer(req.body, clientIdOf(req));
            ok(res, repo, node);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.patch('/api/projects/:pid/containers/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.ContainerUpdateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.updateContainer(
                {unid: req.params.unid, patch: req.body.patch},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.delete('/api/projects/:pid/containers/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        try {
            repo.deleteContainer({unid: req.params.unid}, clientIdOf(req));
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.post('/api/projects/:pid/containers/:unid/move', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.ContainerMoveBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.moveContainer(
                {
                    unid: req.params.unid,
                    toParentUnid: req.body.toParentUnid,
                    index: req.body.index
                },
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    // Schemas ------------------------------------------------------------------

    app.post('/api/projects/:pid/schemas', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.SchemaCreateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            const schema = repo.createSchema(req.body, clientIdOf(req));
            ok(res, repo, schema);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.patch('/api/projects/:pid/schemas/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.SchemaUpdateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.updateSchema(
                {unid: req.params.unid, patch: req.body.patch},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.delete('/api/projects/:pid/schemas/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        try {
            repo.deleteSchema({unid: req.params.unid}, clientIdOf(req));
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.post('/api/projects/:pid/schemas/:unid/move', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.SchemaMoveBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.moveSchema(
                {unid: req.params.unid, toContainerUnid: req.body.toContainerUnid},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    // Fields -------------------------------------------------------------------

    app.post('/api/projects/:pid/schemas/:unid/fields', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.FieldCreateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            const field = repo.createField(
                {
                    schemaUnid: req.params.unid,
                    name: req.body.name,
                    fieldType: req.body.type,
                    optional: req.body.optional,
                    array: req.body.array,
                    types: req.body.types,
                    description: req.body.description,
                    index: req.body.index,
                    unid: req.body.unid
                },
                clientIdOf(req)
            );
            ok(res, repo, field);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.patch('/api/projects/:pid/schemas/:unid/fields/:funid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.FieldUpdateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.updateField(
                {
                    schemaUnid: req.params.unid,
                    fieldUnid: req.params.funid,
                    patch: req.body.patch
                },
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.delete('/api/projects/:pid/schemas/:unid/fields/:funid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        try {
            repo.deleteField(
                {schemaUnid: req.params.unid, fieldUnid: req.params.funid},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.put('/api/projects/:pid/schemas/:unid/fields/order', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.OrderBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.reorderFields(
                {schemaUnid: req.params.unid, order: req.body.order},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    // Enums --------------------------------------------------------------------

    app.post('/api/projects/:pid/enums', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.EnumCreateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            const e = repo.createEnum(req.body, clientIdOf(req));
            ok(res, repo, e);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.patch('/api/projects/:pid/enums/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.EnumUpdateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.updateEnum(
                {unid: req.params.unid, patch: req.body.patch},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.delete('/api/projects/:pid/enums/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        try {
            repo.deleteEnum({unid: req.params.unid}, clientIdOf(req));
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.post('/api/projects/:pid/enums/:unid/move', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.EnumMoveBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.moveEnum(
                {unid: req.params.unid, toContainerUnid: req.body.toContainerUnid},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    // Enum values --------------------------------------------------------------

    app.post('/api/projects/:pid/enums/:unid/values', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.EnumValueCreateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            const value = repo.createEnumValue(
                {
                    enumUnid: req.params.unid,
                    name: req.body.name,
                    value: req.body.value,
                    index: req.body.index,
                    unid: req.body.unid
                },
                clientIdOf(req)
            );
            ok(res, repo, value);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.patch('/api/projects/:pid/enums/:unid/values/:vunid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.EnumValueUpdateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.updateEnumValue(
                {
                    enumUnid: req.params.unid,
                    valueUnid: req.params.vunid,
                    patch: req.body.patch
                },
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.delete('/api/projects/:pid/enums/:unid/values/:vunid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        try {
            repo.deleteEnumValue(
                {enumUnid: req.params.unid, valueUnid: req.params.vunid},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.put('/api/projects/:pid/enums/:unid/values/order', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.OrderBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.reorderEnumValues(
                {enumUnid: req.params.unid, order: req.body.order},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    // Links --------------------------------------------------------------------

    app.post('/api/projects/:pid/links', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.LinkCreateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            const link = repo.createLink(req.body, clientIdOf(req));
            ok(res, repo, link);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.patch('/api/projects/:pid/links/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.LinkUpdateBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        try {
            repo.updateLink(
                {unid: req.params.unid, patch: req.body.patch},
                clientIdOf(req)
            );
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    app.delete('/api/projects/:pid/links/:unid', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        try {
            repo.deleteLink({unid: req.params.unid}, clientIdOf(req));
            ok(res, repo);
        } catch (e) {
            handleError(e, res);
        }
    });

    // Editor settings ----------------------------------------------------------

    app.put('/api/editor-settings', (req, res): void => {
        const errors: SchemaErrors = [];
        if (!Req.EditorSettingsBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        for (const repo of repositories.values()) {
            repo.setEditorSettings(req.body, clientIdOf(req));
        }

        res.status(200).json({success: true});
    });

    // Generate -----------------------------------------------------------------

    app.post('/api/projects/:pid/generate', async (req, res): Promise<void> => {
        const repo = repoOf(req, res);
        if (!repo) return;

        try {
            await repo.flush();
            await ctx.runGenerate(repo);
            res.status(200).json({success: true, rev: repo.getRev()});
        } catch (e) {
            handleError(e, res);
        }
    });

    // Batch --------------------------------------------------------------------

    app.post('/api/projects/:pid/batch', (req, res): void => {
        const repo = repoOf(req, res);
        if (!repo) return;

        const errors: SchemaErrors = [];
        if (!Req.BatchBody.validate(req.body, errors)) {
            badBody(res);
            return;
        }

        const clientId = clientIdOf(req);
        const results: unknown[] = [];

        for (let i = 0; i < req.body.ops.length; i++) {
            const op = req.body.ops[i] as {op: string} & Record<string, unknown>;

            try {
                const data = applyBatchOp(repo, op, clientId);
                results.push({op: op.op, data});
            } catch (e) {
                if (e instanceof RepoError) {
                    res.status(e.httpStatus).json({
                        success: false,
                        msg: e.message,
                        code: e.code,
                        failedIndex: i,
                        failedOp: op.op
                    });
                    return;
                }

                console.error(e);
                res.status(500).json({
                    success: false,
                    msg: 'Internal error',
                    failedIndex: i,
                    failedOp: op.op
                });
                return;
            }
        }

        res.status(200).json({success: true, rev: repo.getRev(), results});
    });
}

/**
 * Dispatch a single batch op to the repo. Mirrors the individual-endpoint
 * routes so behavior is identical whether a mutation is sent alone or inside
 * a batch. Returns the data that the corresponding individual endpoint would
 * have returned (or `undefined` for no-data ops).
 */
function applyBatchOp(
    repo: SchemaFsRepository,
    op: {op: string} & Record<string, unknown>,
    clientId: string|undefined
): unknown {
    switch (op.op) {
        case 'container_create':
            return repo.createContainer(op as never, clientId);
        case 'container_update':
            repo.updateContainer(op as never, clientId);
            return undefined;
        case 'container_delete':
            repo.deleteContainer(op as never, clientId);
            return undefined;
        case 'container_move':
            repo.moveContainer(op as never, clientId);
            return undefined;

        case 'schema_create':
            return repo.createSchema(op as never, clientId);
        case 'schema_update':
            repo.updateSchema(op as never, clientId);
            return undefined;
        case 'schema_delete':
            repo.deleteSchema(op as never, clientId);
            return undefined;
        case 'schema_move':
            repo.moveSchema(op as never, clientId);
            return undefined;

        case 'field_create':
            return repo.createField(
                {
                    schemaUnid: op.schemaUnid as string,
                    name: op.name as string,
                    fieldType: op.type as never,
                    optional: op.optional as boolean|undefined,
                    array: op.array as boolean|undefined,
                    types: op.types as never,
                    description: op.description as string|undefined,
                    index: op.index as number|undefined,
                    unid: op.unid as string|undefined
                },
                clientId
            );
        case 'field_update':
            repo.updateField(op as never, clientId);
            return undefined;
        case 'field_delete':
            repo.deleteField(op as never, clientId);
            return undefined;
        case 'field_reorder':
            repo.reorderFields(op as never, clientId);
            return undefined;

        case 'enum_create':
            return repo.createEnum(op as never, clientId);
        case 'enum_update':
            repo.updateEnum(op as never, clientId);
            return undefined;
        case 'enum_delete':
            repo.deleteEnum(op as never, clientId);
            return undefined;
        case 'enum_move':
            repo.moveEnum(op as never, clientId);
            return undefined;

        case 'enum_value_create':
            return repo.createEnumValue(op as never, clientId);
        case 'enum_value_update':
            repo.updateEnumValue(op as never, clientId);
            return undefined;
        case 'enum_value_delete':
            repo.deleteEnumValue(op as never, clientId);
            return undefined;
        case 'enum_value_reorder':
            repo.reorderEnumValues(op as never, clientId);
            return undefined;

        case 'link_create':
            return repo.createLink(op as never, clientId);
        case 'link_update':
            repo.updateLink(op as never, clientId);
            return undefined;
        case 'link_delete':
            repo.deleteLink(op as never, clientId);
            return undefined;

        default:
            throw new RepoInvalidError(`unknown batch op: ${op.op}`);
    }
}