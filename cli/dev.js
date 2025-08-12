#!/usr/bin/env node

import { createServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = process.cwd();

const configFile = path.resolve(projectRoot, 'vtseditor.json');

if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({
        projects: [
            {
                schemaPath: './schemas/schema.json',
                code: {
                    schemaPrefix: 'Schema',
                    createTypes: true,
                    createIndex: false,
                    codeComment: true,
                    codeIndent: '    '
                },
                autoGenerate: false,
                destinationPath: './schemas/src',
                destinationClear: false
            }
        ],
        server: {
            port: 5173
        }
    }, null, 2));
    console.log('✅ vtseditor.json created');
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

process.env.VTSEDITOR_PROJECT_ROOT = projectRoot;
process.env.VTSEDITOR_CONFIG_FILE = configFile;

let serverPort = 5173;

if (config) {
    if (config.server) {
        if (config.server.port) {
            serverPort = config.server.port;
        }
    }
}

// Vite run
createServer({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    root: path.resolve(__dirname, '..'),
}).then(server => {
    return server.listen(serverPort);
}).then(() => {
    console.log(`🚀 VTS Editor running at http://localhost:${serverPort}`);
}).catch(err => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${serverPort} already in use!`);
    } else {
        console.error('❌ Failed to start VTS Editor:', err);
    }

    process.exit(1);
});