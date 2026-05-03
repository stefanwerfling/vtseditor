# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

VTS Editor is a browser-based visual editor for building [VTS](https://github.com/OpenSourcePKG/vts) type-validation schemas (`Vts.object(...)`, `Vts.string(...)`, etc.). It is distributed as an npm CLI (`npx vtseditor`) that users install into their own project — the editor reads/writes a schema JSON file in that project and generates `.ts` files with VTS schemas and extracted types.

This repository is both the editor's source AND the published package.

## Running

There is no build step, no test suite, and no linter configured. Everything runs through Vite in dev mode.

```bash
node ./cli/dev.js    # or: npm run dev
```

`cli/dev.js` is the published `bin` (`vtseditor`). It:
1. Resolves `vtseditor.json` from `process.cwd()` (creates a default if missing).
2. Sets `VTSEDITOR_PROJECT_ROOT` and `VTSEDITOR_CONFIG_FILE` env vars.
3. Starts `vite.config.ts` (from the editor's install dir) as a dev server.

When hacking on the editor itself, the working directory **is** the project root — so `vtseditor.json` at the repo root is used. `.gitignore` excludes `vtseditor.json`, `schemas/`, and `.env` because they are per-user.

## Architecture: two halves in one Vite process

Despite `vite.config.ts` being a "config" file, it is actually the **backend**: `expressMiddleware()` registers an Express app onto Vite's dev server. All persistence and AI calls live there.

### Backend (Node side, loaded by Vite)
- `vite.config.ts` — Express routes:
  - `GET  /api/load-schema` — returns all projects + extern schemas + editor settings
  - `POST /api/save-schema` — writes schema JSON, runs `SchemaGenerator` if `autoGenerate`, invokes pre/post scripts
  - `POST /api/save-editor-setting` — persists UI-only state (e.g. panel width)
  - `POST /api/provider/createschema/requestprovider` + `GET /api/provider/createschema/load` — AI schema generation
- `Config/Config.ts` — VTS schema for `vtseditor.json`. Config is validated on startup; invalid config aborts the server.
- `SchemaProject/` — per-project runtime state (resolved paths, flags) derived from config entries. Each project gets a generated UUID (`projects.set(crypto.randomUUID(), project)`) — that UUID is the only handle the frontend knows.
- `SchemaExtern/SchemaExternLoader.ts` — walks `node_modules` (and npm workspaces) looking for packages with a `vtseditor` key in their `package.json`; their referenced schema JSON files become **read-only extern projects** shown in the tree.
- `SchemaGenerator/SchemaGenerator.ts` — turns `JsonDataFS` (the tree model) into `.ts` files under `destinationPath`. Uses `SchemaGeneratorRegister` (in-project types) and `SchemaGeneratorExternRegister` (extern module types) to resolve cross-file imports. `SchemaTypes/SchemaTypes.ts` maps the editor's internal type names (`'object'`, `'string'`, `'or'`, …) onto VTS factory names.
- `SchemaScript/SchemaScript.ts` — runs `scripts.before_generate` / `scripts.after_generate` shell hooks.
- `SchemaProvider/` — AI provider plumbing. `SchemaProvider` is a singleton registry; each provider (Gemini / LocalAI / OpenAI) extends `SchemaProviderAIBase`, which owns the conversation history and prompt (`SchemaProviderConversationPrompt.ts`). Models return JSON validated against `SchemaProviderConversationJson`.

### Frontend (browser side)
- `main.ts` → `SchemaEditor/SchemaEditor.ts` — single entry.
- `SchemaEditor.ts` is the top-level controller. It wires a `Treeview`, a `Searchbar`, `jsPlumbInstance` (the diagram canvas), and a long list of **custom window events** defined in `SchemaEditor/Base/EditorEvents.ts`. Components communicate by dispatching these events on `window`, not by direct references. When looking for "where does X happen when the user does Y", grep for the event name first.
- `SchemaEditor/Base/BaseTable.ts` is the parent class for `SchemaTable` and `EnumTable` (the draggable boxes on the canvas). `LinkTable` is **not** a BaseTable subclass — it's a standalone wrapper that reuses the DOM element of a BaseTable living in another file, so a schema can reference external types visually.
- `SchemaEditor/JsonData.ts` defines the wire format **and** the persisted file format — `JsonDataFS` is the recursive tree of folders/files/schemas/enums. Both frontend and backend import it; frontend consumes the type, backend also uses the `SchemaJsonDataFS` validator at request boundaries. Changing this type is a cross-cutting change.
- `SchemaEditor/Register/SchemaTypes.ts` is a browser-side singleton that tracks "what schema/enum names exist right now" so field type pickers and codegen previews stay in sync as the user renames things.

### Shared UI primitives under `SchemaEditor/Base/`
- `AlertDialog` / `ConfirmDialog` — replacements for `window.alert`/`window.confirm`. Both extend `BaseDialog` and expose `showAlert(title, msg, type)` / `showConfirm(title, msg, onConfirm, type?)` statics. **Do not use the native browser dialogs** — JetBrains flags them and they can't be styled to match the rest of the UI. `AlertDialog` flips its "Ok" button from the `dialog-button-cancel` class to `dialog-button-primary` because it's the only visible button in info dialogs.
- `ContextMenu` — the "more actions" dropdowns in table headers and field rows. Trigger is a 3-dots button rendered inline; the menu panel is appended to `document.body` so `overflow: hidden` on the table card (and jsPlumb transforms during drags) cannot clip it. Each item is added via `addItem({ icon, label, onClick, danger?, disabled? })`.
- `Tooltip` — the `ⓘ` info icon next to field names. Same body-appended panel pattern. Anchored to the icon (not the cursor), flips above if no room below.
- `AutoLayout` — the "Arrange" button's algorithm. Takes the active entry's schemas, enums, and **link tables**, builds a dependency graph (via `SchemaTable.getDependencyIds()`), layers by longest-path-from-leaves, then assigns X per layer using measured `offsetWidth` of the widest table in that layer (not a fixed column width — wide schemas would otherwise overlap the next column) and Y stacked from measured `offsetHeight`. Link tables register as layer-0 placeholders keyed by `getLinkObjectUnid()` so dependencies pointing at externally-referenced types find them.

### The schema JSON file
`schemaPath` (default `./schemas/schema.json`) holds the whole editor state as `{ fs: JsonDataFS, editor: { controls_width } }`. This is the user's source of truth — generated `.ts` files under `destinationPath` are derived and can be regenerated.

## Things that will trip you up

- **ESM with `.js` imports in `.ts` files.** `package.json` has `"type": "module"` and `tsconfig.json` targets ESNext. Every internal import must use the `.js` extension even though the source is `.ts` (e.g. `import { SchemaEditor } from './SchemaEditor/SchemaEditor.js'`). This is required for Vite/Node ESM resolution.
- **No compile step.** `tsconfig.json` exists for the IDE / type checking only — TypeScript is never invoked by `npm run dev`. Vite transpiles on the fly. There is no `tsc` script; do not add one without reason.
- **The project dogfoods VTS.** Config objects, the on-disk schema, and AI responses all use `Vts.object(...).validate(...)` at their boundaries. When adding a new field to something persisted or transmitted, update the corresponding `Schema...` validator or it will be silently rejected.
- **Project identity is a runtime UUID**, not a stable ID. Frontend-sent `unid`s for projects must match a UUID the *current* server process generated — restart = new UUIDs. This matters if you are debugging save failures after code reloads.
- **Extern (node_modules) schemas are read-only.** They come from `SchemaExternLoader` scanning packages that declare a `vtseditor` key in their `package.json`. `_scanProject` recurses into npm workspaces.
- **AI conversation state is in-memory on the singleton `SchemaProvider`.** Restarting the server loses it; there is no persistence layer for chat history.
- **Floating UI has a destroy contract.** Any component that appends a panel to `document.body` (`ContextMenu`, `Tooltip`) exposes `destroy()`. The owning component's `remove()` **must** call it, otherwise orphaned panels accumulate every time a table or field is deleted and re-created. Audit `SchemaTable.remove()`, `EnumTable.remove()`, `SchemaTableField.remove()`, `EnumTableValue.remove()` when adding new floating widgets.
- **Field drag-reorder toggles `draggable` on mousedown.** The grip handle on a field row sets `column.draggable = true` in its `mousedown` handler and calls `stopPropagation()` so jsPlumb does not start a table drag on the same event. Reorder uses HTML5 drag with MIME types (`application/x-vts-field`, `application/x-vts-enum-value`) so drop targets can distinguish reorder from other drag sources (e.g. the treeview drag to add a field).
- **CSS design tokens live in `main.css` `:root`.** `--c-primary`, `--c-border`, `--c-shadow-*`, `--c-focus-ring`, `--radius-*` are the shared palette. Prefer `var(--c-primary)` etc. when touching styles rather than hardcoding hex values — the rest of the UI already uses them.

## Config reference

User-facing config docs live in `doc/Config.md` and `doc/ConfigAI.md`. The authoritative schema is `Config/Config.ts` — if they diverge, the code wins.