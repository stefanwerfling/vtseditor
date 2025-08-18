// vite.config.ts
import { defineConfig, Plugin } from 'vite';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {SchemaErrors} from 'vts';
import {SchemaConfig} from './Config/Config.js';
import {JsonData, SchemaJsonData} from './SchemaEditor/JsonData.js';
import {SchemaExternLoader} from './SchemaExtern/SchemaExternLoader.js';
import {SchemaGenerator} from './SchemaGenerator/SchemaGenerator.js';
import {SchemaProject} from './SchemaProject/SchemaProject.js';
import {SchemaProjectSave} from './SchemaProject/SchemaProjectSave.js';
import {ProjectsData, ProjectsResponse} from './SchemaProject/SchemaProjectsResponse.js';


/**
 * Express middleware
 */
function expressMiddleware(): Plugin {
    return {
        name: 'vite-express-middleware',
        configureServer(server) {
            const app = express();
            app.use(express.json());

            // config load ---------------------------------------------------------------------------------------------

            const configFile = process.env.VTSEDITOR_CONFIG_FILE;
            const projectRoot = process.env.VTSEDITOR_PROJECT_ROOT ?? process.cwd();

            const projects: Map<string, SchemaProject> = new Map<string, SchemaProject>();

            if (configFile) {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

                const errors: SchemaErrors = [];

                if (SchemaConfig.validate(config, errors)) {
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
                            codeIndent: '    '
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

            app.post('/api/save-schema', (req, res) => {
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

                                    gen.generate(schema.fs);
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

            app.get('/api/load-schema', (req, res) => {
                const projectsData: ProjectsData = {
                    projects: [],
                    extern: [],
                    editor: {
                        // default
                        controls_width: 300
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

                                if (projectsData.editor === null) {
                                    projectsData.editor = schemaData.editor;
                                }
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

            server.middlewares.use(app);
        }
    };
}

export default defineConfig({
    plugins: [
        expressMiddleware()
    ]
});
