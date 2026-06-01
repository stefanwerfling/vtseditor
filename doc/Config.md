# VTS Editor – Documentation

The **VTS Editor** is a tool for creating, managing, and generating schema files for your projects.  
Configuration is handled via the **`vtseditor.json`** file.

---

## Table of Contents

1. [Example Configuration](#example-configuration)
2. [Configuration Sections](#configuration-sections)
    - [Projects](#projects)
    - [Code Generation](#code)
    - [Scripts](#scripts)
    - [Editor](#editor)
    - [Server](#server)
    - [Browser](#browser)
    - [MCP](#mcp)
3. [Schema storage layout](#schema-storage-layout)
4. [Workflow](#workflow)
5. [Example Workflow](#example-workflow-with-the-provided-config)

---

## Example Configuration

```json
{
  "projects": [
    {
      "name": "MyProject",
      "schemaPath": "./schemas/schema.json",
      "code": {
        "schemaPrefix": "Schema",
        "createTypes": true,
        "createIndex": false,
        "codeComment": true,
        "codeIndent": "    "
      },
      "autoGenerate": false,
      "destinationPath": "./schemas/src",
      "destinationClear": false,
      "scripts": {
        "before_generate": [],
        "after_generate": [
          {
            "path": "./schemas",
            "script": "npm run compile"
          }
        ]
      }
    }
  ],
  "server": {
    "port": 5173
  },
  "browser": {
    "open": false
  }
}
```

---

## Configuration Sections

### `projects`
Defines a list of projects managed by the VTS Editor.

| Field                | Type      | Description |
|-----------------------|-----------|-------------|
| **`name`**            | `string`  | Project name. |
| **`schemaPath`**      | `string`  | Path to the main schema file (JSON). |
| **`code`**            | `object`  | Code generation settings. |
| **`autoGenerate`**    | `boolean` | If `true`, code will be generated automatically when the schema changes. |
| **`destinationPath`** | `string`  | Output folder for generated files. |
| **`destinationClear`**| `boolean` | If `true`, clears the destination folder before generation. |
| **`scripts`**         | `object`  | Scripts to run before or after code generation. |

---

### `code`
Controls how code is generated.

| Field                | Type      | Description |
|-----------------------|-----------|-------------|
| **`schemaPrefix`**    | `string`  | Prefix for generated schema classes (e.g. `SchemaUser`). |
| **`createTypes`**     | `boolean` | Generates additional TypeScript type definitions. |
| **`createIndex`**     | `boolean` | Generates an `index.ts` for exports. |
| **`codeComment`**     | `boolean` | Includes comments in generated code. |
| **`codeIndent`**      | `string`  | Defines indentation (e.g. `"    "` for 4 spaces). |

---

### `scripts`
Allows running hooks before and after code generation.

| Field                 | Type      | Description |
|------------------------|-----------|-------------|
| **`before_generate`**  | `array`   | List of scripts to run *before* code generation. |
| **`after_generate`**   | `array`   | List of scripts to run *after* code generation. |

A **script object** contains:
- **`path`**: Working directory for the script.
- **`script`**: Command to execute (e.g. `npm run compile`).

---

### `editor`
Editor-side runtime settings. AI provider entries (`providers`, `aiProvider`) are documented in [ConfigAI.md](ConfigAI.md).

| Field                       | Type      | Description |
|------------------------------|-----------|-------------|
| **`openEntryCacheSize`**     | `number`  | Optional. How many recently-opened files keep their canvas tables (schemas/enums/links) hydrated in the browser besides the currently active one. Older files are dehydrated on an LRU basis and re-fetched on demand when reopened. Default `3`, minimum `1`. Raise it on projects where you frequently switch between many files; lower it to keep memory bounded on huge schemas. |
| **`historySize`**            | `number`  | Optional. How many historical snapshots are kept per schema and per enum inside the chunk file (`schemas/entries/<unid>.json`). A snapshot is appended on every save whose state for that item differs from disk; oldest entries beyond the limit are dropped. Default `20`, minimum `1`. Browse and restore from the **View history** entry in each schema / enum context menu. |

Example:

```json
{
  "editor": {
    "openEntryCacheSize": 5,
    "historySize": 30
  }
}
```

---

### `server`
Defines server settings for the VTS Editor.

| Field       | Type     | Description |
|-------------|----------|-------------|
| **`port`**  | `number` | Port where the editor will be available (default: `5173`). |

---

### `browser`
Controls browser behavior when starting the editor.

| Field       | Type      | Description |
|-------------|-----------|-------------|
| **`open`**  | `boolean` | If `true`, the editor opens automatically in the browser. |

---

### `mcp`
Opt-in Model Context Protocol endpoint so AI agents (e.g. Claude CLI) can edit the same repository the web editor uses. Disabled unless the section is present.

| Field         | Type      | Description |
|---------------|-----------|-------------|
| **`enabled`** | `boolean` | Required. `true` mounts the MCP endpoint on the dev server. |
| **`path`**    | `string`  | Optional URL path (default `/mcp`). |

See [ConfigMcp.md](ConfigMcp.md) for the full tool list and Claude CLI setup.

---

## Schema storage layout

Since **v1.2.0** the file pointed at by `schemaPath` is an **index** plus
per-file content chunks alongside it:

```
schemas/
  schema.json                 ← tree skeleton (version: 2)
  entries/
    <fileEntryUnid>.json      ← one chunk per "file" entry
    ...
  schema.v1.backup.json       ← only present when migrated from v1
```

- **Auto-migration**: if you upgrade from `< 1.2.0` and your schema
  is still in the legacy single-file (v1) layout, the next save
  rewrites it as v2 and copies the original to
  `schema.v1.backup.json`. The migration runs once and is safe to
  delete the backup afterwards.
- **Chunk shape**: each `entries/<unid>.json` carries that file
  entry's `schemas`, `enums`, optional `links`, and an optional
  `history` map keyed by item unid. See [`editor.historySize`](#editor)
  for the history cap.
- **Stale-chunk cleanup**: when a file entry is deleted, the matching
  `entries/<unid>.json` is removed on the next flush.
- **Hand-edited chunks** validate the same way as the index; a
  malformed chunk shows up as an empty file entry rather than
  crashing the server.

---

## Workflow

1. **Create/Edit Schema**  
   Define your schema in the file specified by `schemaPath`.

2. **Generate Code**
    - Can be triggered manually or automatically (depending on `autoGenerate`).
    - Output is written to `destinationPath`.

3. **Run Scripts**
    - `before_generate`: Preparation steps (e.g. cleanup, validation).
    - `after_generate`: Post-processing steps (e.g. compile the generated code).

---

## Example Workflow with the Provided Config

1. Schema is located at:
   ```bash
   ./schemas/schema.json
   ```

2. Code is generated into:
   ```bash
   ./schemas/src
   ```

3. After code generation, the following script is executed inside `./schemas`:
   ```bash
   npm run compile
   ```

---

✅ With this setup, you can easily manage your schemas, keep code generation consistent, and automate build steps with pre- and post-generation scripts.  