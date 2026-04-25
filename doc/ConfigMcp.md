# VTS Editor – MCP Server

The **VTS Editor** can expose a [Model Context Protocol](https://modelcontextprotocol.io/) endpoint so AI agents — for example **Claude CLI** — can read and mutate your schema tree through the same repository the web editor uses.

The MCP server is **opt-in** and runs in the same process as the Vite dev server, so there are no race conditions between the browser tab and an AI client editing the same project at the same time. Changes made via MCP show up in the open editor tab automatically (via the SSE event stream), and vice versa.

---

## Table of Contents

1. [Enabling the MCP server](#enabling-the-mcp-server)
2. [Configuration Reference](#configuration-reference)
3. [Claude CLI Setup](#claude-cli-setup)
4. [Available Tools](#available-tools)
5. [How it fits together](#how-it-fits-together)

---

## Enabling the MCP server

Add an `mcp` section to your `vtseditor.json`:

```json
{
  "projects": [ /* ... */ ],
  "server": {
    "port": 5173
  },
  "mcp": {
    "enabled": true
  }
}
```

Start the editor as usual:

```bash
npx vtseditor
```

You should see both lines in the boot log:

```
🤖 MCP server mounted at /mcp
🚀 VTS Editor running at http://localhost:5173
```

The MCP endpoint is then available at `http://localhost:5173/mcp`.

---

## Configuration Reference

### `mcp`

| Field         | Type      | Default   | Description |
|---------------|-----------|-----------|-------------|
| **`enabled`** | `boolean` | —         | **Required.** Set to `true` to mount the MCP endpoint. Omit the section (or set `false`) to disable it entirely. |
| **`path`**    | `string`  | `"/mcp"`  | URL path under the dev server host where the MCP endpoint is mounted. Change it if you reverse-proxy the editor or want to isolate multiple MCP-enabled projects on one host. |
| **`logging`** | `object`  | —         | Optional. Records every tool call, policy decision, approval flow event, and session lifecycle event. See [below](#logging). |

Transport is the **MCP Streamable HTTP transport** (stateful mode, server-issued session IDs). The same endpoint handles both `POST` messages and the SSE response stream.

---

### `mcp.logging`

Turns the MCP server into a verbose audit trail. Entries are emitted as single-line JSON objects (one per event) so the output stays grep- and `jq`-friendly.

```json
{
  "mcp": {
    "enabled": true,
    "logging": {
      "enabled": true,
      "file": "./logs/mcp.log"
    }
  }
}
```

| Field         | Type      | Default  | Description |
|---------------|-----------|----------|-------------|
| **`enabled`** | `boolean` | —        | **Required.** `true` turns logging on; if the whole `logging` block is omitted nothing is recorded. |
| **`file`**    | `string`  | — / stdout | Optional path (resolved against the project root). If set, log lines are appended to that file; the directory is created on startup. If omitted, lines are printed to stdout with an `[mcp]` prefix. |

Each log line contains at least `ts` (ISO timestamp) and `event`. Notable events:

| Event | When |
|-------|------|
| `server_boot` | MCP endpoint mounted. |
| `session_initialized` / `session_closed` | A new Streamable-HTTP transport is opened or closed. |
| `tools_registered` / `tools_list` | Static registration + every `tools/list` request. |
| `tool_call` | Before dispatch — includes `tool`, `args`, `policy`, `override`, effective `action`. |
| `tool_approval_requested` / `tool_approval_resolved` | The gate delegated to the user, plus the outcome. |
| `tool_result` / `tool_error` / `tool_denied` / `tool_invalid_args` / `tool_unknown` | Final disposition of the call (with `durationMs`). |
| `approval_request` / `approval_decided` / `approval_timeout` | Raw approval-bus activity. |
| `approval_override_set` / `approval_persisted` / `approval_persist_failed` | `remember: session` / `forever` decisions and disk writes. |

Everything is logged synchronously on the same process; disable the block if you don't want the extra I/O.

---

## Claude CLI Setup

Add the server to Claude CLI's MCP config (project-scoped `.mcp.json` or the global settings):

```json
{
  "mcpServers": {
    "vtseditor": {
      "type": "http",
      "url": "http://localhost:5173/mcp"
    }
  }
}
```

Start Claude CLI from the project root. `/mcp` inside Claude shows the connected servers; all schema tools are prefixed with `vts_` so they're grouped.

> **Note:** The Vite dev server must be running for Claude to reach the endpoint. Project unids are generated at server startup and reset on every restart, so if you restart the editor while a Claude session is open, Claude should re-run `vts_list_projects` to pick up the new unids.

---

## Available Tools

All tools are prefixed with `vts_`. They mirror the granular REST API one-to-one and share the same validation + event stream.

### Read

| Tool | Purpose |
|------|---------|
| `vts_list_projects` | Enumerate loaded projects with their runtime unids and current revisions. Call first to discover the `projectUnid` all other tools require. |
| `vts_get_tree` | Return the full `JsonDataFS` for a project — use before mutating to discover existing unids. |

### Containers (folders / files)

| Tool | Purpose |
|------|---------|
| `vts_create_folder` | Create a folder container. |
| `vts_create_file`   | Create a file container (holds schemas, enums, links). |
| `vts_update_container` | Rename / retype / retoggle a container. |
| `vts_delete_container` | Delete an empty container. |
| `vts_move_container` | Move a container under a different parent. |

### Schemas & fields

| Tool | Purpose |
|------|---------|
| `vts_create_schema` | Create a schema inside a container. |
| `vts_update_schema` | Patch name / description / extend / position. |
| `vts_delete_schema` | Delete a schema and all its fields. |
| `vts_move_schema`   | Move a schema to a different container. |
| `vts_create_field`  | Add a field to a schema. |
| `vts_update_field`  | Patch field name / type / description / optional / array / types. |
| `vts_delete_field`  | Delete a field. |
| `vts_reorder_fields`| Reorder fields by a list of field unids. |

### Enums & values

| Tool | Purpose |
|------|---------|
| `vts_create_enum` | Create an enum inside a container. |
| `vts_update_enum` | Patch enum name / description / position. |
| `vts_delete_enum` | Delete an enum and its values. |
| `vts_move_enum`   | Move an enum to a different container. |
| `vts_create_enum_value` | Add a value to an enum. |
| `vts_update_enum_value` | Patch value name / value. |
| `vts_delete_enum_value` | Delete an enum value. |
| `vts_reorder_enum_values` | Reorder enum values by a list of value unids. |

### Links

| Tool | Purpose |
|------|---------|
| `vts_create_link` | Create a visual link in a file referencing another schema/enum. |
| `vts_update_link` | Update link position. |
| `vts_delete_link` | Delete a link. |

### Code generation

| Tool | Purpose |
|------|---------|
| `vts_generate` | Explicitly run the code generator for a project. Usually unnecessary when `autoGenerate: true` — the generator then runs automatically after every committed mutation. |

Each create tool accepts an optional client-supplied `unid`; if omitted the server mints one. Supplying your own unids lets you reference items across multiple tool calls without an extra round-trip.

---

## How it fits together

- **Single source of truth:** MCP tools and the web editor both go through the same `SchemaRepositoryRegistry` — one repository per project, held in memory.
- **Atomic writes:** every mutation triggers a debounced atomic write (`.tmp` + `rename`). Bursts of MCP calls coalesce into one file write.
- **autoGenerate:** if your project has `autoGenerate: true`, the code generator runs once per debounced flush — regardless of whether the mutation came from the browser, REST API, or MCP.
- **Live updates:** mutations are published on the project's SSE stream (`GET /api/projects/:pid/events`); the open browser tab picks them up automatically, so an MCP-driven edit appears in the UI without a manual refresh.