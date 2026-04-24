import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {SchemaFsRepository} from '../SchemaRepository/SchemaFsRepository.js';
import {SchemaRepositoryRegistry} from '../SchemaRepository/SchemaRepositoryRegistry.js';
import {RegisterVtsMcpToolsOptions} from './SchemaMcpToolRegistry.js';
import {registerSchemaMcpTools} from './SchemaMcpTools.js';

/**
 * External dependencies MCP tools need. Same shape as the web API's context
 * so the same `runGenerate` closure covers both code paths.
 */
export type SchemaMcpContext = {
    repositories: SchemaRepositoryRegistry;
    runGenerate: (repo: SchemaFsRepository) => Promise<void>;
};

/**
 * Builds the `instructions` string returned in the MCP initialize
 * response. MCP clients (Claude Code, Cursor, …) surface this to the
 * model as "how to use this server". We use it to steer clients away
 * from editing the on-disk schema JSON directly — direct `Edit`/`Write`
 * bypasses the repository layer and therefore the event bus,
 * autoGenerate, and before/after scripts.
 *
 * The actual schema-file paths are listed so the instruction is
 * concrete rather than generic.
 */
function buildInstructions(ctx: SchemaMcpContext): string {
    const schemaFiles = Array.from(ctx.repositories.values(), (repo) => repo.getProject().schemaPath);

    const fileLines = schemaFiles.length > 0
        ? schemaFiles.map((p) => `  - ${p}`).join('\n')
        : '  (no projects loaded yet)';

    return [
        'This server owns the VTS schema editor state for this project.',
        '',
        'The schema JSON file(s):',
        fileLines,
        '',
        'RULES:',
        '1. Treat the schema JSON file(s) above as READ-ONLY from your side.',
        '   Do NOT edit them with Edit / Write / str_replace / shell redirects.',
        '   Direct edits bypass this server and break:',
        '   - live editor sessions (they will not see your change),',
        '   - the SchemaGenerator (`autoGenerate` will not rerun),',
        '   - before/after scripts,',
        '   - the policy gate and user-approval flow.',
        '2. To INSPECT the schema, prefer `vts_get_tree` over reading the file.',
        '   Reading the file is tolerated for quick look-ups but the tool',
        '   returns a live, structured view with revision numbers.',
        '3. To MUTATE the schema, always use the `vts_*` tools on this server',
        '   (create_/update_/delete_/move_/reorder_/generate). Some tools are',
        '   gated by `⚠ Requires user approval` — expect a short blocking',
        '   wait when you call them.',
        '4. Call `vts_get_policy` if you want to know which tools are allowed,',
        '   ask, or denied in the current session before you plan a change.'
    ].join('\n');
}

/**
 * Creates a fully-configured MCP server with all VTS schema tools
 * registered. The caller attaches a transport (e.g.
 * {@link StreamableHTTPServerTransport}) and calls `connect()`.
 */
export function createSchemaMcpServer(
    ctx: SchemaMcpContext,
    options: RegisterVtsMcpToolsOptions = {}
): McpServer {
    const server = new McpServer(
        {
            name: 'vtseditor',
            version: '1.0.0'
        },
        {
            instructions: buildInstructions(ctx)
        }
    );

    registerSchemaMcpTools(server, ctx, options);

    return server;
}