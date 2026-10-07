/**
 * DOM lookup root for the editor's top-level elements.
 *
 * Standalone, the editor owns the whole page, so lookups go against
 * `document` (unchanged behaviour). When embedded in a host that mounts
 * several tools into one document (pkgstudio), several of vtseditor's
 * fixed top-level ids (`treeview`, `main`, `controls`, `resizer`,
 * `resizer-topbar`, `topbarheader`, `schemagrid`, …) collide with
 * another module's. The host therefore scopes the editor to its mount
 * container via {@link setEmbedRoot}; {@link findEl} then resolves ids
 * inside that container instead of document-wide.
 */
let root: Document | HTMLElement = document;

export function setEmbedRoot(el: HTMLElement): void {
    root = el;
}

/**
 * Find a top-level element by id, scoped to the embed root. Returns the
 * same thing `document.getElementById(id)` would when not embedded.
 */
export function findEl(id: string): HTMLElement | null {
    if (root === document) {
        return document.getElementById(id);
    }
    return (root as HTMLElement).querySelector<HTMLElement>(`#${id}`);
}
