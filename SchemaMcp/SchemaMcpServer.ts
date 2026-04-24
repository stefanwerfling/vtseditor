import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {SchemaFsRepository} from '../SchemaRepository/SchemaFsRepository.js';
import {SchemaRepositoryRegistry} from '../SchemaRepository/SchemaRepositoryRegistry.js';
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
 * Creates a fully-configured MCP server with all VTS schema tools
 * registered. The caller attaches a transport (e.g.
 * {@link StreamableHTTPServerTransport}) and calls `connect()`.
 */
export function createSchemaMcpServer(ctx: SchemaMcpContext): McpServer {
    const server = new McpServer({
        name: 'vtseditor',
        version: '1.0.0'
    });

    registerSchemaMcpTools(server, ctx);

    return server;
}