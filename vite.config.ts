// vite.config.ts
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {SchemaErrors, Vts} from 'vts';
import {ConfigAIProviderName, SchemaConfig} from './Config/Config.js';
import {JsonData, SchemaJsonData, SchemaJsonEditorSettings} from './SchemaEditor/JsonData.js';
import {SchemaExternLoader} from './SchemaExtern/SchemaExternLoader.js';
import {SchemaGenerator} from './SchemaGenerator/SchemaGenerator.js';
import {SchemaProject} from './SchemaProject/SchemaProject.js';
import {
    ProjectGenerateSchemaResponse,
    SchemaProjectGenerateSchema
} from './SchemaProject/SchemaProjectGenerateSchema.js';
import {SchemaProjectSave} from './SchemaProject/SchemaProjectSave.js';
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
            const projects: Map<string, SchemaProject> = new Map<string, SchemaProject>();
            let providerAiName: string|ConfigAIProviderName = ConfigAIProviderName.localai;

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

                        projects.set(crypto.randomUUID(), project);
                    }
                } else {
                    console.log('Your config file has an incorrect structure, please check the!');
                    console.log(errors);
                    return;
                }
            }

            const loader = new SchemaExternLoader(projectRoot);
            loader.scan().then();

            // ---------------------------------------------------------------------------------------------------------

            app.post('/api/save-editor-setting', (req, res) => {
                const bodyData = req.body;

                if (SchemaJsonEditorSettings.validate(bodyData, [])) {
                    let hasError = false;

                    for (const project of projects.values()) {
                        const content = fs.readFileSync(project.schemaPath, 'utf-8');
                        const schemaData = JSON.parse(content);

                        if (SchemaJsonData.validate(schemaData, [])) {
                            const schema: JsonData = {
                                fs: schemaData.fs,
                                editor: bodyData
                            };

                            fs.mkdirSync(path.dirname(project.schemaPath), { recursive: true });
                            fs.writeFileSync(project.schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

                            console.log(`Save editor setting for Project: ${project.schemaPath}`);
                        } else {
                            console.error(`Save editor setting corrupted schema file: ${project.schemaPath}`);
                            hasError = true;
                        }
                    }

                    if (hasError) {
                        res.status(500).json({ success: false, msg: '`Save editor setting corrupted schema file.'});
                        return;
                    }

                    res.status(200).json({ success: true });
                } else {
                    res.status(500).json({ success: false, msg: 'Bad request body schema!'});
                }
            });

            // ---------------------------------------------------------------------------------------------------------

            app.post('/api/save-schema', async(req, res): Promise<void> => {
                const bodyData = req.body;

                if (SchemaProjectSave.validate(bodyData, [])) {
                    const projectsData = bodyData.data;

                    for (const project of projectsData.projects) {
                        const projectOption = projects.get(project.unid);

                        if (projectOption) {
                            const schema: JsonData = {
                                fs: project.fs,
                                editor: projectsData.editor ?? {
                                    controls_width: 300
                                }
                            };

                            fs.mkdirSync(path.dirname(projectOption.schemaPath), { recursive: true });
                            fs.writeFileSync(projectOption.schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

                            if (projectOption.autoGenerate) {
                                const gen = new SchemaGenerator({
                                    schemaPrefix: projectOption.schemaPrefix,
                                    createTypes: projectOption.createTypes,
                                    createIndex: projectOption.createIndex,
                                    destinationPath: projectOption.destinationPath,
                                    destinationClear: projectOption.destinationClear,
                                    code_indent: projectOption.codeIndent,
                                    code_comment: projectOption.codeComment
                                });

                                try {
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

                                    gen.generate(schema.fs);

                                    await SchemaScript.run(projectOption.scripts_after_generate);
                                } catch (e) {
                                    console.log(e);
                                }
                            }
                        }
                    }
                } else {
                    console.log('Body is not validate!');
                }

                res.status(200).json({ success: true });
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

                for (const [punid, project] of projects.entries()) {
                    try {
                        if (fs.existsSync(project.schemaPath)) {
                            const content = fs.readFileSync(project.schemaPath, 'utf-8');
                            const schemaData = JSON.parse(content);

                            if (SchemaJsonData.validate(schemaData, [])) {
                                projectsData.projects.push({
                                    unid: punid,
                                    name: project.name,
                                    fs: schemaData.fs
                                });

                                projectsData.editor = schemaData.editor;
                            }
                        } else {
                            projectsData.projects.push({
                                unid: punid,
                                name: project.name,
                                fs: {
                                    unid: 'root',
                                    name: 'root',
                                    istoggle: true,
                                    icon: 'root',
                                    type: 'root',
                                    entrys: [],
                                    schemas: [],
                                    enums: []
                                }
                            });
                        }
                    } catch (e) {
                        console.log('Error: ');
                        console.log(e);
                    }
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

            // Build a SchemaValidator spanning every saved project file. Used
            // by both validate-schema and schema-example. Externs are not yet
            // included (MVP scope).
            const buildCombinedValidator = (): SchemaValidator|null => {
                let validator: SchemaValidator|null = null;

                for (const project of projects.values()) {
                    try {
                        if (!fs.existsSync(project.schemaPath)) {
                            continue;
                        }

                        const content = fs.readFileSync(project.schemaPath, 'utf-8');
                        const schemaData = JSON.parse(content);

                        if (!SchemaJsonData.validate(schemaData, [])) {
                            continue;
                        }

                        if (validator === null) {
                            validator = new SchemaValidator(schemaData.fs);
                        } else {
                            validator.addFs(schemaData.fs);
                        }
                    } catch (e) {
                        console.log('buildCombinedValidator: failed to load project file');
                        console.log(e);
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

            server.middlewares.use(app);
        }
    };
}

export default defineConfig({
    plugins: [
        expressMiddleware()
    ]
});
