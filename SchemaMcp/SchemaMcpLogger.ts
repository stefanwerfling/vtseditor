import fs from 'fs';
import path from 'path';
import {ConfigMcpLogging} from '../Config/Config.js';

/**
 * JSON-line logger for MCP activity. Every entry is a single-line JSON
 * object so the output stays grep-/jq-friendly regardless of whether it
 * lands in a terminal or a file.
 *
 * When disabled (either `logging` omitted from `vtseditor.json` or
 * `enabled: false`) every call is a no-op — callers can emit freely
 * without guarding each call site.
 */
export class SchemaMcpLogger {

    private readonly _enabled: boolean;
    private readonly _file: string|null;

    public constructor(cfg: ConfigMcpLogging|undefined, projectRoot: string) {
        this._enabled = cfg?.enabled === true;
        this._file = this._enabled && cfg?.file
            ? path.resolve(projectRoot, cfg.file)
            : null;

        if (this._file) {
            try {
                fs.mkdirSync(path.dirname(this._file), {recursive: true});
            } catch (err) {
                console.error(
                    `[mcp] could not prepare log directory for ${this._file}: `
                    + (err instanceof Error ? err.message : String(err))
                );
            }
        }
    }

    public isEnabled(): boolean {
        return this._enabled;
    }

    /**
     * Records an event. `detail` keys are merged alongside `ts` and
     * `event` in the output object.
     */
    public log(event: string, detail: Record<string, unknown> = {}): void {
        if (!this._enabled) {
            return;
        }

        const entry = {
            ts: new Date().toISOString(),
            event,
            ...detail
        };

        let line: string;

        try {
            line = JSON.stringify(entry);
        } catch {
            // Fallback for values containing cycles — stringify each
            // field individually, skipping anything that still fails.
            const safe: Record<string, unknown> = {ts: entry.ts, event: entry.event};

            for (const [k, v] of Object.entries(detail)) {
                try {
                    JSON.stringify(v);
                    safe[k] = v;
                } catch {
                    safe[k] = `[unserializable ${typeof v}]`;
                }
            }

            line = JSON.stringify(safe);
        }

        if (this._file) {
            try {
                fs.appendFileSync(this._file, `${line}\n`, 'utf-8');
            } catch (err) {
                console.error(
                    `[mcp] log append failed: `
                    + (err instanceof Error ? err.message : String(err))
                );
            }
        } else {
            console.log(`[mcp] ${line}`);
        }
    }

}