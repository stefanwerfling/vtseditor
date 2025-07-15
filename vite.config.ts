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

            app.post('/api/save-schema', (req, res) => {
                const schema = req.body;
                const filePath = path.resolve(__dirname, 'schemas', 'schema.json');

                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, JSON.stringify(schema, null, 2), 'utf-8');

                res.status(200).json({ success: true });
            });

            app.get('/api/load-schema', (req, res) => {
                const filePath = path.resolve(__dirname, 'schemas', 'schema.json');
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: 'File not found!' });
                }

                const content = fs.readFileSync(filePath, 'utf-8');
                res.status(200).json(JSON.parse(content));
            });

            // Express in Vite-Devserver einbinden
            server.middlewares.use(app);
        }
    };
}

export default defineConfig({
    plugins: [
        expressMiddleware()
    ]
});
