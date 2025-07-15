#!/usr/bin/env node

import { createServer } from 'vite';
import path from 'path';
import fs from 'fs';

const configFile = path.resolve(process.cwd(), 'vtseditor.json');

// Falls nicht vorhanden: Konfigurationsdatei anlegen
if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({
        schemaPath: './schemas/schema.json'
    }, null, 2));
    console.log('✅ vtseditor.json create');
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
process.env.VTSEDITOR_SCHEMA_PATH = path.resolve(process.cwd(), config.schemaPath);

// Vite starten
createServer({
    configFile: path.resolve(new URL('../vite.config.ts', import.meta.url).pathname)
}).then(server => {
    return server.listen();
}).then(() => {
    console.log('🚀 VTS Editor run http://localhost:5173');
});