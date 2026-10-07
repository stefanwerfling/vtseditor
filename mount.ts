import 'normalize.css';
import './main.css';
import {SchemaEditor} from './SchemaEditor/SchemaEditor.js';
import {setEmbedRoot} from './SchemaEditor/embedRoot.js';

/**
 * Embeddable entry point for the vtseditor frontend.
 *
 * Standalone, `main.ts` boots the editor against the fixed DOM in
 * `index.html` and starts the IDE plugin bridge. For in-process hosting
 * (pkgstudio) this `mount()` injects the same markup into a caller
 * container, scopes the editor's top-level lookups to it (so its fixed
 * ids like `#treeview` / `#main` don't collide with another module's),
 * and starts the editor — without the plugin WebSocket (no `/ws/plugin`
 * in the embedded host). The API base is applied by the host shell's
 * request rewrite, so no call site needs editing.
 */
export interface VtseditorMountOptions {
    /** Namespaced base (e.g. "/vtseditor"); applied by the host shell. */
    apiBase?: string;
}

/** Body of index.html (topbar + main), minus the standalone <script>. */
const VTS_MARKUP = `
  <div class="topbar">
    <span class="topbar-header" id="topbarheader">
      <span id="topbar-title">VTS - Schema Builder</span>
      <span id="topbar-schema"></span>
    </span>
    <div id="resizer-topbar" class="resizer"></div>
    <div class="buttonbar" id="buttonbar">
      <button id="addSchemaBtn" class="btn-grey">➕ Add Schema</button>
      <button id="addEnumBtn" class="btn-grey">🧩 Add Enum</button>
      <button id="createSchemaBtn" class="btn-grey">🧠 Create Schema</button>
      <button id="arrangeTablesBtn" class="btn-grey" title="Arrange tables by dependency">📐 Arrange</button>
    </div>
  </div>
  <div id="main">
    <div id="controls">
      <div class="treeview" id="treeview"></div>
    </div>
    <div id="resizer" class="resizer"></div>
    <div id="schemagrid"></div>
  </div>`;

export async function mount(container: HTMLElement, _opts: VtseditorMountOptions = {}): Promise<void> {
    container.classList.add('vtseditor-root');
    container.innerHTML = VTS_MARKUP;

    // Scope the editor's fixed-id lookups to this container BEFORE any
    // SchemaEditor/jsPlumb code resolves an element.
    setEmbedRoot(container);

    const editor = new SchemaEditor();
    editor.init();
}
