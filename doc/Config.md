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
    - [Server](#server)
    - [Browser](#browser)
3. [Workflow](#workflow)
4. [Example Workflow](#example-workflow)

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