// vite.config.ts
import { defineConfig, Plugin } from 'vite';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {SchemaErrors} from 'vts';
import {SchemaConfig} from './Config/Config.js';
import {JsonData} from './SchemaEditor/JsonData.js';
import {SchemaExternLoader} from './SchemaExtern/SchemaExternLoader.js';
import {SchemaGenerator} from './SchemaGenerator/SchemaGenerator.js';

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

            let schemaPath = path.resolve('schemas', 'schema.json');
            let schemaPrefix = 'Schema';
            let createTypes = false;
            let createIndex = false;
            let autoGenerate = false;
            let destinationPath = path.resolve('schemas', 'src');
            let destinationClear = false;
            let codeComment = false;
            let codeIndent = '    '

            if (configFile) {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

                const errors: SchemaErrors = [];

                if (SchemaConfig.validate(config, errors)) {
                    schemaPath = path.resolve(projectRoot, config.project.schemaPath);
                    autoGenerate = config.project.autoGenerate ?? autoGenerate;

                    if (config.project.destinationPath) {
                        destinationPath = path.resolve(projectRoot, config.project.destinationPath);
                    }

                    if (config.project.destinationClear) {
                        destinationClear = config.project.destinationClear ?? destinationClear;
                    }

                    if (config.project.code) {
                        const pcode = config.project.code;

                        schemaPrefix = pcode.schemaPrefix ?? schemaPrefix;
                        createTypes = pcode.createTypes ?? createTypes;
                        createIndex = pcode.createIndex ?? createIndex;
                        codeComment = pcode.codeComment ?? codeComment;
                        codeIndent = pcode.codeIndent ?? codeIndent;
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

            console.log('VTS Editor Options:');
            console.log(`\tSchema-Path: ${schemaPath}`);
            console.log(`\tSchema-Prefix: ${schemaPrefix}`);
            console.log(`\tCreate Types: ${createTypes ? 'true' : 'false'}`);
            console.log(`\tCreate Index: ${createIndex ? 'true' : 'false'}`);
            console.log(`\tAuto Generate files by save: ${autoGenerate ? 'true' : 'false'}`);
            console.log(`\tDestination-Path: ${destinationPath}`);
            console.log(`\tDestination-Clear: ${destinationClear ? 'true' : 'false'}`);
            console.log(`\tCode comments: ${createIndex ? 'true' : 'false'}`);
            console.log(' ');

            app.post('/api/save-schema', (req, res) => {
                const schema = req.body as JsonData;

                fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
                fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

                if (autoGenerate) {
                    const gen = new SchemaGenerator({
                        schemaPrefix: schemaPrefix,
                        createTypes: createTypes,
                        createIndex: createIndex,
                        destinationPath: destinationPath,
                        destinationClear: destinationClear,
                        code_indent: codeIndent,
                        code_comment: codeComment
                    });

                    try {
                        gen.generate(schema.fs);
                    } catch (e) {
                        console.log(e);
                    }
                }

                res.status(200).json({ success: true });
            });

            app.get('/api/load-schema', (req, res) => {
                if (!fs.existsSync(schemaPath)) {
                    return res.status(404).json({ error: 'File not found!' });
                }

                const content = fs.readFileSync(schemaPath, 'utf-8');
                res.status(200).json(JSON.parse(content));
            });

            app.get('/api/load-types', (req, res) => {

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
