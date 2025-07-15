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
        schemaPath: './schemas/schema.json'
    }, null, 2));
    console.log('✅ vtseditor.json created');
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
process.env.VTSEDITOR_SCHEMA_PATH = path.resolve(projectRoot, config.schemaPath);

// Vite run
createServer({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    root: path.resolve(__dirname, '..'),
}).then(server => {
    return server.listen();
}).then(() => {
    console.log('🚀 VTS Editor running at http://localhost:5173');
}).catch(err => {
    console.error('❌ Failed to start VTS Editor:', err);
    process.exit(1);
});