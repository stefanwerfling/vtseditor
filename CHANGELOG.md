# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **MCP server with policy gate and user-approval flow.**
  A Model Context Protocol endpoint (opt-in via `mcp.enabled` in
  `vtseditor.json`) exposes ~28 `vts_*` tools that mutate the schema
  tree through the same repository the web editor uses.
  - Client-agnostic permission policy (`mcp.policy.rules`,
    `allow | ask | deny`) configured in `vtseditor.json` — no
    per-client allowlists.
  - `ask`-tools prompt the user via SSE + inline approval dialog;
    decisions support *Don't remember / This session / Forever*.
    `Forever` writes a rule back into `vtseditor.json`.
  - `tools/list` hides deny-tools and flags ask-tools with
    `⚠ Requires user approval —` so MCP clients plan accordingly.
  - `vts_get_policy` tool exposes the effective action for every
    registered tool, including active session/forever overrides.
  - MCP `initialize` response ships server instructions steering
    clients away from editing the schema JSON file directly.
- **Anthropic and Claude Code AI providers**
  (`SchemaProviderAnthropic`, `SchemaProviderClaudeCode`) alongside the
  existing Gemini / LocalAI / OpenAI providers; see `doc/ConfigAI.md`.
- **Schema validation dialog** (`SchemaValidateDialog`) and
  `SchemaValidator` with deep validation against live VTS schemas;
  can be triggered externally (e.g. JetBrains plugin) via the
  `validateSchema` editor event.
- **Granular HTTP API** (`SchemaApiRoutes`, `SchemaApiRequests`,
  `SchemaApiClient`, `SchemaEditorApiCall`, `SchemaPatchReducer`)
  replacing the monolithic save-schema endpoint. Mutations are
  dispatched per operation (create / update / delete / move /
  reorder) so concurrent edits stay consistent.
- **Live SSE event stream per project**
  (`GET /api/projects/:pid/events`) — remote mutations (other tabs,
  MCP) echo to every open browser session.
- **Remote-change highlighting**: schemas / enums / links touched
  by another tab or by an MCP tool call get a short pulse and a
  centred scroll so the user sees where the change landed.
- **AutoLayout "Arrange"** — dependency-graph layered layout for
  schemas, enums, and link tables with measured widths per layer.
- **URL-driven schema selection** (`?schema=…` query) and topbar
  header showing the active schema name.

### Changed

- **Native `window.alert` / `window.confirm` replaced with inline
  `AlertDialog` / `ConfirmDialog`** throughout the editor so JetBrains'
  embedded browser no longer flags dialogs and styling matches the
  rest of the UI.
- **UI theme refresh** for tables, dialogs, treeview, search
  results, and context menus; shared CSS design tokens moved into
  `main.css` `:root` (`--c-primary`, `--c-border`, `--c-shadow-*`,
  `--c-focus-ring`, `--radius-*`).
- **ExtendField and MultiType** reworked with badge-style rendering,
  nested type descriptors, and drag-reorder via HTML5 drag with
  MIME-typed payloads.
- **Context menu panels and tooltips** are now appended to
  `document.body` so `overflow: hidden` on table cards and jsPlumb
  transforms during drags no longer clip them.
- **`editor_settings` SSE payload** is now merged into the local
  copy instead of replacing it — partial payloads from another tab
  no longer drop local keys like `active_entry_unid`.
- **`SchemaEditor` internal cleanup**:
  - `_updateTreeview` and `_createSchema` moved to `protected`
    (only internal callers).
  - `getElementById` force-unwraps replaced with
    `SchemaEditor._requireElement(id)` — missing DOM ids now fail
    at init with a descriptive error.
  - `_pendingRemoteNew` / `_trackRemoteNew` / `_flushRemoteNewHighlights`
    renamed to `*Touched` to match the fact that the set covers
    creates, updates, moves, and deletes.
  - `_scheduleRemoteResync` documented as leading-edge throttle
    (not trailing-edge debounce) so the reader understands why a
    steady stream of remote edits still resyncs within ~150 ms.

### Fixed

- **Approval dialog race**: `McpApprovalDialog` used to register a
  second click-listener on top of the `BaseDialog` default, which
  fired after `destroy()` had already run. Default handlers are now
  overridable (`_handleCancel` / `_handleConfirm` / `_handleCloseX`);
  the approval dialog overrides them and emits the decision exactly
  once. Close-X keeps its no-remember semantics.
- **Silent failure when approval decision POST returns 404** (race
  with another tab, or timeout): the user now sees an `AlertDialog`
  explaining that the approval window had closed.
- **Link-connection view, drag & drop, ExtendField / MultiType**
  rendering issues and the context-menu positioning after a jsPlumb
  drag.
- **Generator**: index generation now sorts deterministically and
  async run exceptions are caught and surfaced.
- **Enum table**: entry-enum name-check no longer rejects legitimate
  renames.
- **Typo `detionationId` → `destinationId`** in
  `SchemaEditorMoveEventDetail` and the three `TreeviewEntry`
  dispatchers.

## [1.0.8]

Baseline for this changelog. Earlier releases do not have
individual entries; consult the git history for detail.