// vite.config.ts
import { defineConfig, Plugin } from 'vite';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {SchemaJsonData} from './SchemaEditor/SchemaJsonData.js';
import {SchemaGenerator} from './SchemaGenerator/SchemaGenerator.js';

function expressMiddleware(): Plugin {
    return {
        name: 'vite-express-middleware',
        configureServer(server) {
            const app = express();
            app.use(express.json());

            const schemaPath = process.env.VTSEDITOR_SCHEMA_PATH || path.resolve('schemas', 'schema.json');
            const schemaPrefix = process.env.VTSEDITOR_SCHEMA_PREFIX || 'Schema';
            const createTypes = process.env.VTSEDITOR_CREATE_TYPES === '1';
            const createIndex = process.env.VTSEDITOR_CREATE_INDEX === '1';
            const autoGenerate = process.env.VTSEDITOR_AUTO_GENERATE === '1';
            const destinationPath = process.env.VTSEDITOR_DESTINATION_PATH || path.resolve('schemas', 'src');

            console.log('VTS Editor Options:');
            console.log(`\tSchema-Path: ${schemaPath}`);
            console.log(`\tSchema-Prefix: ${schemaPrefix}`);
            console.log(`\tCreate Types: ${createTypes ? 'true' : 'false'}`);
            console.log(`\tCreate Index: ${createIndex ? 'true' : 'false'}`);
            console.log(`\tAuto Generate files by save: ${autoGenerate ? 'true' : 'false'}`);
            console.log(`\tDestination-Path: ${destinationPath}`);
            console.log(' ');

            app.post('/api/save-schema', (req, res) => {
                const schema = req.body as SchemaJsonData;

                fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
                fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

                if (autoGenerate) {
                    const gen = new SchemaGenerator({
                        schemaPrefix: schemaPrefix,
                        createTypes: createTypes,
                        createIndex: createIndex,
                        destinationPath: destinationPath
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

            server.middlewares.use(app);
        }
    };
}

export default defineConfig({
    plugins: [
        expressMiddleware()
    ]
});
