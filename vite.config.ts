// vite.config.ts
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, Plugin} from 'vite';
import {SchemaErrors, Vts} from 'vts';
import {ConfigAIProviderName, ConfigMcp, SchemaConfig} from './Config/Config.js';
import {SchemaJsonData} from './SchemaEditor/JsonData.js';
import {SchemaExternLoader} from './SchemaExtern/SchemaExternLoader.js';
import {SchemaGenerator} from './SchemaGenerator/SchemaGenerator.js';
import {SchemaProject} from './SchemaProject/SchemaProject.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {registerSchemaApiRoutes} from './SchemaApi/SchemaApiRoutes.js';
import {
    McpApprovalBus,
    McpApprovalEvent,
    McpApprovalRemember
} from './SchemaMcp/SchemaMcpApprovalBus.js';
import {SchemaMcpLogger} from './SchemaMcp/SchemaMcpLogger.js';
import {compileMcpPolicy} from './SchemaMcp/SchemaMcpPolicy.js';
import {persistPolicyRule} from './SchemaMcp/SchemaMcpPolicyPersister.js';
import {createSchemaMcpServer} from './SchemaMcp/SchemaMcpServer.js';
import {SchemaFsRepository} from './SchemaRepository/SchemaFsRepository.js';
import {SchemaRepositoryEvent} from './SchemaRepository/SchemaRepositoryEventBus.js';
import {SchemaRepositoryRegistry} from './SchemaRepository/SchemaRepositoryRegistry.js';
import {
    ProjectGenerateSchemaResponse,
    SchemaProjectGenerateSchema
} from './SchemaProject/SchemaProjectGenerateSchema.js';
import {ProjectsData, ProjectsResponse} from './SchemaProject/SchemaProjectsResponse.js';
import {SchemaProvider} from './SchemaProvider/SchemaProvider.js';
import {SchemaProviderAIBase} from './SchemaProvider/SchemaProviderAIBase.js';
import {SchemaScript} from './SchemaScript/SchemaScript.js';
import {SchemaValidator} from './SchemaValidator/SchemaValidator.js';

/**
 * Request body schema for POST /api/validate-schema.
 */
const SchemaValidateRequest = Vts.object({
    schemaUnid: Vts.string(),
    json: Vts.string()
});

/**
 * Request body schema for POST /api/schema-example.
 */
const SchemaExampleRequest = Vts.object({
    schemaUnid: Vts.string()
});

/**
 * Express middleware
 */
function expressMiddleware(): Plugin {
    return {
        name: 'vite-express-middleware',
        configureServer(server) {
            const app = express();

            app.use(express.json({ limit: '50mb' }));
            app.use(express.urlencoded({ limit: '50mb', extended: true }));

            // ---------------------------------------------------------------------------------------------------------

            const configFile = process.env.VTSEDITOR_CONFIG_FILE;
            const projectRoot = process.env.VTSEDITOR_PROJECT_ROOT ?? process.cwd();

            const envPath = path.resolve(projectRoot, ".env");

            if (fs.existsSync(envPath)) {
                console.log(`Read Env.`);

                dotenv.config({
                    quiet: true,
                    path: envPath
                });
            }

            // config load ---------------------------------------------------------------------------------------------
            const repositories = new SchemaRepositoryRegistry();
            let providerAiName: string|ConfigAIProviderName = ConfigAIProviderName.localai;
            let mcpSection: ConfigMcp|undefined;

            if (configFile) {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

                const errors: SchemaErrors = [];

                if (SchemaConfig.validate(config, errors)) {
                    if (config.server) {
                        if (config.server.limit) {
                            app.use(express.json({ limit: `${config.server.limit}` }));
                            app.use(express.urlencoded({ limit: `${config.server.limit}`, extended: true }));

                            console.log(`Set new Server limit: ${config.server.limit}`);
                        }
                    }

                    if (config.editor) {
                        // init providers ------------------------------------------------------------------------------

                        for (const aProvider of config.editor.providers) {
                            SchemaProvider.getInstance().addNewProvider(aProvider);
                        }

                        if (config.editor.aiProvider) {
                            providerAiName = config.editor.aiProvider;
                        }
                    }

                    if (config.mcp) {
                        mcpSection = config.mcp;
                    }

                    for (const aSchemaProject of config.projects) {
                        const project: SchemaProject = {
                            name: 'Schema project',
                            schemaPath: path.resolve('schemas', 'schema.json'),
                            schemaPrefix: 'Schema',
                            createTypes: false,
                            createIndex: false,
                            autoGenerate: false,
                            destinationPath: path.resolve('schemas', 'src'),
                            destinationClear: false,
                            codeComment: false,
                            codeIndent: '    ',
                            scripts_before_generate: [],
                            scripts_after_generate: []
                        };

                        project.name = aSchemaProject.name ?? project.name;
                        project.schemaPath = path.resolve(projectRoot, aSchemaProject.schemaPath);
                        project.autoGenerate = aSchemaProject.autoGenerate ?? project.autoGenerate;

                        if (aSchemaProject.destinationPath) {
                            project.destinationPath = path.resolve(projectRoot, aSchemaProject.destinationPath);
                        }

                        if (aSchemaProject.destinationClear) {
                            project.destinationClear = aSchemaProject.destinationClear ?? project.destinationClear;
                        }

                        if (aSchemaProject.code) {
                            const pcode = aSchemaProject.code;

                            project.schemaPrefix = pcode.schemaPrefix ?? project.schemaPrefix;
                            project.createTypes = pcode.createTypes ?? project.createTypes;
                            project.createIndex = pcode.createIndex ?? project.createIndex;
                            project.codeComment = pcode.codeComment ?? project.codeComment;
                            project.codeIndent = pcode.codeIndent ?? project.codeIndent;
                        }

                        if (aSchemaProject.scripts) {
                            if (aSchemaProject.scripts.before_generate) {
                                for (const script of aSchemaProject.scripts.before_generate) {
                                    project.scripts_before_generate.push({
                                        script: script.script,
                                        path: script.path
                                    });
                                }
                            }

                            if (aSchemaProject.scripts.after_generate) {
                                for (const script of aSchemaProject.scripts.after_generate) {
                                    project.scripts_after_generate.push({
                                        script: script.script,
                                        path: script.path
                                    });
                                }
                            }
                        }

                        console.log(`VTS Project: ${project.name}`);
                        console.log(`\tSchema-Path: ${project.schemaPath}`);
                        console.log(`\tSchema-Prefix: ${project.schemaPrefix}`);
                        console.log(`\tCreate Types: ${project.createTypes ? 'true' : 'false'}`);
                        console.log(`\tCreate Index: ${project.createIndex ? 'true' : 'false'}`);
                        console.log(`\tAuto Generate files by save: ${project.autoGenerate ? 'true' : 'false'}`);
                        console.log(`\tDestination-Path: ${project.destinationPath}`);
                        console.log(`\tDestination-Clear: ${project.destinationClear ? 'true' : 'false'}`);
                        console.log(`\tCode comments: ${project.createIndex ? 'true' : 'false'}`);
                        console.log(' ');
                        console.log(' ');

                        repositories.register(crypto.randomUUID(), project);
                    }
                } else {
                    console.log('Your config file has an incorrect structure, please check the!');
                    console.log(errors);
                    return;
                }
            }

            const loader = new SchemaExternLoader(projectRoot);
            loader.scan().then();

            // Flush any pending debounced writes on shutdown so granular
            // mutations queued just before SIGINT are not lost.
            const flushOnExit = (): void => {
                void repositories.flushAll();
            };

            process.once('SIGINT', flushOnExit);
            process.once('SIGTERM', flushOnExit);
            process.once('beforeExit', flushOnExit);

            // -----------------------------------------------------------------
            // Code generation pipeline shared by the legacy /api/save-schema
            // autoGenerate path and the explicit /api/projects/:pid/generate
            // endpoint. Callers are expected to have flushed the repo first.
            // -----------------------------------------------------------------
            const runGenerate = async (repo: SchemaFsRepository): Promise<void> => {
                const projectOption = repo.getProject();

                const gen = new SchemaGenerator({
                    schemaPrefix: projectOption.schemaPrefix,
                    createTypes: projectOption.createTypes,
                    createIndex: projectOption.createIndex,
                    destinationPath: projectOption.destinationPath,
                    destinationClear: projectOption.destinationClear,
                    code_indent: projectOption.codeIndent,
                    code_comment: projectOption.codeComment
                });

                const externFiles = loader.getList();

                for (const [, externSource] of externFiles.entries()) {
                    try {
                        if (fs.existsSync(externSource.schemaFile)) {
                            const content = fs.readFileSync(externSource.schemaFile, 'utf-8');
                            const schemaData = JSON.parse(content);

                            if (SchemaJsonData.validate(schemaData, [])) {
                                gen.setExternSource(externSource, schemaData.fs);
                            }
                        }
                    } catch (e) {
                        console.log('Error: ');
                        console.log(e);
                    }
                }

                await SchemaScript.run(projectOption.scripts_before_generate);

                gen.generate(repo.getFs());

                await SchemaScript.run(projectOption.scripts_after_generate);
            };

            // Wire autoGenerate onto each repo's post-flush hook. Mutations
            // go through the debounced flush, so a burst of granular edits
            // coalesces into one write -> one regeneration.
            for (const repo of repositories.values()) {
                if (repo.getProject().autoGenerate) {
                    repo.setPostFlushHook(() => runGenerate(repo));
                }
            }

            // -----------------------------------------------------------------
            // MCP server (opt-in via `vtseditor.json` -> `mcp.enabled`). Lives
            // in the same process as the web editor and talks to the same
            // `SchemaRepositoryRegistry`, so MCP edits and web edits share
            // one source of truth and echo through the same SSE stream.
            //
            // Multi-session: the underlying `McpServer` from the SDK tracks a
            // single initialize-state, so we allocate one server+transport
            // per session. The first request from a new client (no session
            // id + `initialize` body) creates the pair; subsequent requests
            // route by `Mcp-Session-Id` header.
            // -----------------------------------------------------------------
            if (mcpSection?.enabled) {
                const mcpPath = mcpSection.path ?? '/mcp';
                const mcpDecide = compileMcpPolicy(mcpSection.policy);
                const mcpLogger = new SchemaMcpLogger(mcpSection.logging, projectRoot);
                const mcpApprovalBus = new McpApprovalBus();
                mcpApprovalBus.setLogger(mcpLogger);
                const mcpTransports = new Map<string, StreamableHTTPServerTransport>();

                if (mcpLogger.isEnabled()) {
                    console.log(
                        `🤖 MCP logging enabled${mcpSection.logging?.file ? ` -> ${mcpSection.logging.file}` : ' (stdout)'}`
                    );
                }

                mcpLogger.log('server_boot', {
                    path: mcpPath,
                    projects: Array.from(repositories.values()).length,
                    logFile: mcpSection.logging?.file ?? null
                });

                if (configFile) {
                    mcpApprovalBus.setForeverPersister((toolName, action) =>
                        persistPolicyRule(configFile, toolName, action)
                    );
                }

                // Approval SSE stream — dedicated channel separate from the
                // per-project repository bus because approvals can target
                // any project (or none, for list tools).
                app.get('/api/mcp/approvals/events', (req, res): void => {
                    res.status(200);
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache, no-transform');
                    res.setHeader('Connection', 'keep-alive');
                    res.setHeader('X-Accel-Buffering', 'no');
                    res.flushHeaders();

                    const writeEvent = (ev: McpApprovalEvent): void => {
                        res.write(`event: ${ev.type === 'request' ? 'approval_request' : 'approval_resolved'}\n`);
                        res.write(`data: ${JSON.stringify(ev)}\n\n`);
                    };

                    const unsubscribe = mcpApprovalBus.subscribe(writeEvent);

                    const pingTimer = setInterval(() => {
                        res.write(`: ping ${Date.now()}\n\n`);
                    }, 30000);

                    const cleanup = (): void => {
                        clearInterval(pingTimer);
                        unsubscribe();
                    };

                    req.on('close', cleanup);
                    req.on('aborted', cleanup);
                });

                // Decision endpoint — body {allow, remember?}. Unknown or
                // already-decided requestIds return 404 so a duplicate
                // click from a second tab does not double-resolve.
                // `remember='session'` caches the decision for the
                // server's lifetime; `remember='forever'` also patches
                // `vtseditor.json` via the persister.
                app.post('/api/mcp/approvals/:requestId', async (req, res): Promise<void> => {
                    const requestId = req.params.requestId;
                    const body = req.body as {allow?: unknown; remember?: unknown};

                    if (typeof body.allow !== 'boolean') {
                        res.status(400).json({success: false, msg: '`allow` must be a boolean'});
                        return;
                    }

                    let remember: McpApprovalRemember|undefined;

                    if (body.remember === 'session' || body.remember === 'forever') {
                        remember = body.remember;
                    } else if (body.remember !== undefined && body.remember !== null) {
                        res.status(400).json({
                            success: false,
                            msg: '`remember` must be "session", "forever", or omitted'
                        });
                        return;
                    }

                    const ok = await mcpApprovalBus.decide(requestId, body.allow, remember);

                    if (!ok) {
                        res.status(404).json({success: false, msg: `Unknown or already-decided request ${requestId}`});
                        return;
                    }

                    res.status(200).json({success: true});
                });

                const isInitializeRequest = (body: unknown): boolean => {
                    if (Array.isArray(body)) {
                        return body.some(isInitializeRequest);
                    }
                    return typeof body === 'object'
                        && body !== null
                        && (body as {method?: unknown}).method === 'initialize';
                };

                app.all(mcpPath, async (req, res): Promise<void> => {
                    const headerSessionId = req.header('Mcp-Session-Id');
                    let transport: StreamableHTTPServerTransport|undefined;

                    if (headerSessionId) {
                        transport = mcpTransports.get(headerSessionId);

                        if (!transport) {
                            res.status(404).json({
                                jsonrpc: '2.0',
                                error: {code: -32000, message: `Unknown MCP session ${headerSessionId}`},
                                id: null
                            });
                            return;
                        }
                    } else if (req.method === 'POST' && isInitializeRequest(req.body)) {
                        transport = new StreamableHTTPServerTransport({
                            sessionIdGenerator: () => crypto.randomUUID(),
                            onsessioninitialized: (sid) => {
                                mcpTransports.set(sid, transport!);
                                mcpLogger.log('session_initialized', {sessionId: sid});
                            }
                        });
                        transport.onclose = (): void => {
                            if (transport?.sessionId) {
                                mcpTransports.delete(transport.sessionId);
                                mcpLogger.log('session_closed', {sessionId: transport.sessionId});
                            }
                        };

                        const mcpServer = createSchemaMcpServer(
                            {repositories, runGenerate},
                            {
                                decide: mcpDecide,
                                onApprovalRequest: (toolName, args) =>
                                    mcpApprovalBus.request(toolName, args),
                                getSessionOverride: (toolName) =>
                                    mcpApprovalBus.getSessionOverride(toolName),
                                logger: mcpLogger
                            }
                        );
                        await mcpServer.connect(transport);
                    } else {
                        res.status(400).json({
                            jsonrpc: '2.0',
                            error: {code: -32000, message: 'No MCP session; send initialize first.'},
                            id: null
                        });
                        return;
                    }

                    await transport.handleRequest(req, res, req.body);
                });

                console.log(`🤖 MCP server mounted at ${mcpPath}`);
            }

            // ---------------------------------------------------------------------------------------------------------

            app.get('/api/projects/:pid/events', (req, res): void => {
                const pid = req.params.pid;
                const bus = repositories.getBus(pid);

                if (!bus) {
                    res.status(404).json({success: false, msg: `Unknown project ${pid}`});
                    return;
                }

                res.status(200);
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache, no-transform');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Accel-Buffering', 'no');
                res.flushHeaders();

                const writeEvent = (ev: SchemaRepositoryEvent): void => {
                    res.write(`id: ${ev.rev}\n`);
                    res.write(`event: ${ev.op}\n`);
                    res.write(`data: ${JSON.stringify(ev)}\n\n`);
                };

                const writeResync = (): void => {
                    res.write('event: resync\n');
                    res.write('data: {}\n\n');
                };

                // Resume from Last-Event-ID header (EventSource reconnect) or
                // ?last_event_id= query param (first connect from a client
                // that already holds a baseline). Absent header -> start from
                // scratch, no replay, only live events.
                const headerVal = req.header('Last-Event-ID');
                const queryVal = req.query.last_event_id;
                const raw = headerVal ?? (typeof queryVal === 'string' ? queryVal : undefined);

                if (raw !== undefined) {
                    const sinceRev = Number.parseInt(raw, 10);

                    if (!Number.isFinite(sinceRev)) {
                        writeResync();
                    } else {
                        const replay = bus.replaySince(sinceRev);

                        if (replay === null) {
                            writeResync();
                        } else {
                            for (const ev of replay) {
                                writeEvent(ev);
                            }
                        }
                    }
                }

                const unsubscribe = bus.subscribe(writeEvent);

                // SSE keep-alive comment so proxies / clients with idle
                // timeouts do not drop the stream between real events.
                const pingTimer = setInterval(() => {
                    res.write(`: ping ${Date.now()}\n\n`);
                }, 30000);

                const cleanup = (): void => {
                    clearInterval(pingTimer);
                    unsubscribe();
                };

                req.on('close', cleanup);
                req.on('aborted', cleanup);
            });

            // Legacy /api/save-schema and /api/save-editor-setting endpoints
            // were removed in Phase 5. All mutations now go through the
            // granular routes registered by `registerSchemaApiRoutes` below.

            // ---------------------------------------------------------------------------------------------------------

            // Welcome screen data: product name/version/description from
            // the editor's own package.json plus the raw CHANGELOG.md
            // text. Both files live next to this vite.config.ts in the
            // editor install, not in the user project. import.meta.url
            // resolves to the editor's source regardless of CWD.
            const editorRoot = path.dirname(fileURLToPath(import.meta.url));

            app.get('/api/welcome', async (_req, res): Promise<void> => {
                try {
                    const pkgRaw = await fs.promises.readFile(
                        path.resolve(editorRoot, 'package.json'),
                        'utf-8'
                    );
                    const pkg = JSON.parse(pkgRaw) as {
                        name?: string;
                        version?: string;
                        description?: string;
                    };

                    const [changelog, readme] = await Promise.all([
                        fs.promises.readFile(
                            path.resolve(editorRoot, 'CHANGELOG.md'),
                            'utf-8'
                        ).catch(() => ''),
                        fs.promises.readFile(
                            path.resolve(editorRoot, 'README.md'),
                            'utf-8'
                        ).catch(() => '')
                    ]);

                    res.status(200).json({
                        name: pkg.name ?? 'vtseditor',
                        version: pkg.version ?? '',
                        description: pkg.description ?? '',
                        changelog,
                        readme
                    });
                } catch (err) {
                    res.status(500).json({
                        success: false,
                        msg: err instanceof Error ? err.message : String(err)
                    });
                }
            });

            // ---------------------------------------------------------------------------------------------------------

            app.get('/api/load-schema', (_req, res) => {
                const projectsData: ProjectsData = {
                    projects: [],
                    extern: [],
                    editor: {
                        // default
                        controls_width: 300
                    },
                    init: {
                        enable_schema_create: SchemaProvider.getInstance().count() > 0
                    }
                };

                // load projects schemas -------------------------------------------------------------------------------

                for (const [punid, repo] of repositories.entries()) {
                    projectsData.projects.push({
                        unid: punid,
                        name: repo.getProject().name,
                        fs: repo.getFs()
                    });

                    projectsData.editor = repo.getEditorSettings();
                }

                // extern schemas --------------------------------------------------------------------------------------

                const externFiles = loader.getList();

                for (const [eunid, externSource] of externFiles.entries()) {
                    try {
                        if (fs.existsSync(externSource.schemaFile)) {
                            const content = fs.readFileSync(externSource.schemaFile, 'utf-8');
                            const schemaData = JSON.parse(content);

                            if (SchemaJsonData.validate(schemaData, [])) {
                                projectsData.extern.push({
                                    unid: eunid,
                                    name: externSource.name,
                                    fs: schemaData.fs
                                });
                            }
                        } else {
                            console.log(`File not found: ${externSource.schemaFile}`);
                        }
                    } catch (e) {
                        console.log('Error: ');
                        console.log(e);
                    }
                }

                // -----------------------------------------------------------------------------------------------------

                const response: ProjectsResponse = {
                    data: projectsData
                };

                res.status(200).json(response);
            });

            // ---------------------------------------------------------------------------------------------------------

            // Build a SchemaValidator spanning every project's in-memory fs.
            // Used by both validate-schema and schema-example. Externs are not
            // yet included (MVP scope).
            const buildCombinedValidator = (): SchemaValidator|null => {
                let validator: SchemaValidator|null = null;

                for (const repo of repositories.values()) {
                    const projectFs = repo.getFs();

                    if (validator === null) {
                        validator = new SchemaValidator(projectFs);
                    } else {
                        validator.addFs(projectFs);
                    }
                }

                return validator;
            };

            app.post('/api/validate-schema', (req, res): void => {
                const bodyData = req.body;

                if (!SchemaValidateRequest.validate(bodyData, [])) {
                    res.status(400).json({
                        success: false,
                        msg: 'Bad request body.'
                    });
                    return;
                }

                const validator = buildCombinedValidator();

                if (validator === null || !validator.hasSchema(bodyData.schemaUnid)) {
                    res.status(404).json({
                        success: false,
                        msg: `Schema unid=${bodyData.schemaUnid} not found in any saved project.`
                    });
                    return;
                }

                // Parse incoming JSON input. Parse errors flow into the same
                // error tree so the frontend renders uniformly.
                let parsed: unknown;

                try {
                    parsed = JSON.parse(bodyData.json);
                } catch (e) {
                    res.status(200).json({
                        success: true,
                        result: {
                            valid: false,
                            errors: {
                                key: '',
                                messages: [`Invalid JSON: ${(e as Error).message}`],
                                children: []
                            }
                        }
                    });
                    return;
                }

                const result = validator.validate(bodyData.schemaUnid, parsed);

                res.status(200).json({
                    success: true,
                    result
                });
            });

            app.post('/api/schema-example', (req, res): void => {
                const bodyData = req.body;

                if (!SchemaExampleRequest.validate(bodyData, [])) {
                    res.status(400).json({
                        success: false,
                        msg: 'Bad request body.'
                    });
                    return;
                }

                const validator = buildCombinedValidator();

                if (validator === null || !validator.hasSchema(bodyData.schemaUnid)) {
                    res.status(404).json({
                        success: false,
                        msg: `Schema unid=${bodyData.schemaUnid} not found in any saved project.`
                    });
                    return;
                }

                try {
                    const example = validator.generateExample(bodyData.schemaUnid);
                    res.status(200).json({
                        success: true,
                        example
                    });
                } catch (e) {
                    res.status(500).json({
                        success: false,
                        msg: (e as Error).message
                    });
                }
            });

            // ---------------------------------------------------------------------------------------------------------

            app.post('/api/provider/createschema/requestprovider', async (req, res) => {
                const bodyData = req.body;

                if (SchemaProjectGenerateSchema.validate(bodyData, [])) {
                    const provider = SchemaProvider.getInstance().getProvider(providerAiName);

                    if (provider) {
                        const ai = provider as SchemaProviderAIBase;

                        await ai.generateSchema(bodyData.description);

                        const response: ProjectGenerateSchemaResponse = {
                            conversation: ai.getConversation()
                        };

                        res.status(200).json(response);
                        return;
                    }
                }

                res.status(500).json({
                    error: 'Error'
                });
            });

            // ---------------------------------------------------------------------------------------------------------

            app.get('/api/provider/createschema/load', async (_req, res) => {
                const provider = SchemaProvider.getInstance().getProvider(providerAiName);

                if (provider) {
                    if (provider) {
                        const ai = provider as SchemaProviderAIBase;

                        const response: ProjectGenerateSchemaResponse = {
                            conversation: ai.getConversation()
                        };

                        res.status(200).json(response);
                        return;
                    }
                }
            });

            // ---------------------------------------------------------------------------------------------------------

            registerSchemaApiRoutes(app, {
                repositories,
                runGenerate
            });

            server.middlewares.use(app);
        }
    };
}

export default defineConfig({
    plugins: [
        expressMiddleware()
    ]
});
