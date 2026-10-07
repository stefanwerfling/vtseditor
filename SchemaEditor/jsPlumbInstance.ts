import { newInstance, BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import { findEl } from './embedRoot.js';

/**
 * Lazily-created jsPlumb instance.
 *
 * Previously this created the instance at import time with
 * `document.getElementById('schemagrid')`, which (a) crashed when the
 * module was imported before that element existed and (b) always bound
 * to the document-wide `#schemagrid`. Both break in-process embedding
 * (pkgstudio), where the editor mounts into a container that only exists
 * after import and whose `#schemagrid` must be found inside it.
 *
 * The exported default is a Proxy that creates the real instance on first
 * use — by which point the container DOM has been injected and (when
 * embedded) the embed root set — so every existing `jsPlumbInstance.x()`
 * call site keeps working unchanged.
 */
let instance: BrowserJsPlumbInstance | null = null;

function ensure(): BrowserJsPlumbInstance {
    if (instance === null) {
        const container = findEl('schemagrid');

        if (container === null) {
            throw new Error('jsPlumbInstance: #schemagrid not found in DOM');
        }

        instance = newInstance({ container });
    }

    return instance;
}

const jsPlumbInstance = new Proxy({} as BrowserJsPlumbInstance, {
    get(_target, prop): unknown {
        const inst = ensure() as unknown as Record<string | symbol, unknown>;
        const value = inst[prop];
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(inst) : value;
    }
}) as BrowserJsPlumbInstance;

export default jsPlumbInstance;
