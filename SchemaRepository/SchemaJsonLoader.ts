import fs from 'fs';
import path from 'path';
import {
    JsonData,
    JsonDataFS,
    SchemaJsonData,
    SchemaJsonDataFSType,
    SchemaJsonEntryChunk
} from '../SchemaEditor/JsonData.js';

/**
 * Read a `schema.json` from disk and resolve the in-memory tree.
 * Transparently handles both on-disk layouts:
 *   - **v1**: legacy single-file. Returned tree mirrors the file.
 *   - **v2** (`version: 2`): index + per-file chunks under
 *     `entries/<unid>.json` next to the index. Each file-type entry's
 *     content is spliced back into the returned tree so callers see
 *     the same shape as v1.
 *
 * Returns `null` when the file is missing, unparseable, or fails
 * structural validation. The function is read-only — no migration is
 * performed. Callers that own the file (the project repository) handle
 * migration on flush.
 */
export function loadJsonDataFromFile(schemaFile: string): JsonData|null {
    if (!fs.existsSync(schemaFile)) {
        return null;
    }

    let raw: string;

    try {
        raw = fs.readFileSync(schemaFile, 'utf-8');
    } catch {
        return null;
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!SchemaJsonData.validate(parsed, [])) {
        return null;
    }

    if (parsed.version === 2) {
        const entriesDir = path.join(path.dirname(schemaFile), 'entries');
        hydrateChunks(parsed.fs, entriesDir);
    }

    return parsed;
}

function hydrateChunks(node: JsonDataFS, entriesDir: string): void {
    if (node.type === SchemaJsonDataFSType.file) {
        const chunkPath = path.join(entriesDir, `${node.unid}.json`);

        if (fs.existsSync(chunkPath)) {
            try {
                const chunkParsed = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));

                if (SchemaJsonEntryChunk.validate(chunkParsed, [])) {
                    node.schemas = chunkParsed.schemas;
                    node.enums = chunkParsed.enums;

                    if (chunkParsed.links !== undefined) {
                        node.links = chunkParsed.links;
                    }
                }
            } catch {
                // ignore — caller sees an empty file node, same as
                // when the chunk is missing entirely.
            }
        }
    }

    for (const child of node.entrys as JsonDataFS[]) {
        hydrateChunks(child, entriesDir);
    }
}