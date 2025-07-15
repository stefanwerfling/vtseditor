// vite.config.ts
import { defineConfig, Plugin } from 'vite';
import express from 'express';
import fs from 'fs';
import path from 'path';

function expressMiddleware(): Plugin {
    return {
        name: 'vite-express-middleware',
        configureServer(server) {
            const app = express();
            app.use(express.json());

            const schemaPath = process.env.VTSEDITOR_SCHEMA_PATH || path.resolve('schemas', 'schema.json');

            app.post('/api/save-schema', (req, res) => {
                const schema = req.body;
                fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
                fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

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
