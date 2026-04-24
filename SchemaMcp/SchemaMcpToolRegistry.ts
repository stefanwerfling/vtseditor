import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    CallToolRequestSchema,
    CallToolResult,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import {ExtractSchemaResultType, Schema, SchemaErrors} from 'vts';
import {JsonSchemaNode, vtsDescriptionToJsonSchema} from './VtsToJsonSchema.js';

/**
 * Tool call handler. Receives the already-validated arguments (shape
 * matches the tool's VTS inputSchema) and returns an MCP tool result.
 */
export type VtsMcpToolHandler<T> = (args: T) => Promise<CallToolResult>|CallToolResult;

/**
 * A tool registered via VTS rather than zod. `inputSchema` is used for
 * both the advertised JSON Schema (via {@link vtsDescriptionToJsonSchema})
 * and runtime argument validation.
 */
export type VtsMcpTool = {
    name: string;
    description: string;
    inputSchema: Schema<unknown>;
    handler: VtsMcpToolHandler<unknown>;
};

/**
 * Type-preserving tool builder. Infers the argument type from the VTS
 * input schema so each tool's handler receives properly-typed args
 * without manual casts at the call site.
 */
export function defineVtsMcpTool<S extends Schema<unknown>>(
    config: {
        name: string;
        description: string;
        inputSchema: S;
        handler: VtsMcpToolHandler<ExtractSchemaResultType<S>>;
    }
): VtsMcpTool {
    return {
        name: config.name,
        description: config.description,
        inputSchema: config.inputSchema,
        handler: config.handler as VtsMcpToolHandler<unknown>
    };
}

/**
 * Register a set of VTS-schema-typed MCP tools on an McpServer,
 * bypassing {@link McpServer.registerTool} (which is hard-bound to zod).
 * We wire `tools/list` and `tools/call` handlers directly onto the
 * underlying {@link Server} so our own code stays zod-free — the SDK
 * keeps zod only as a transitive dep for its own request schemas.
 */
export function registerVtsMcpTools(mcp: McpServer, tools: readonly VtsMcpTool[]): void {
    const byName = new Map<string, VtsMcpTool>();

    for (const tool of tools) {
        if (byName.has(tool.name)) {
            throw new Error(`Duplicate MCP tool name: ${tool.name}`);
        }

        byName.set(tool.name, tool);
    }

    // Compute JSON Schemas once — tool definitions are static over the
    // life of the server and `describe()` walks the whole schema tree.
    const toolList: Array<{name: string; description: string; inputSchema: JsonSchemaNode}> =
        tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: vtsDescriptionToJsonSchema(t.inputSchema.describe() as never)
        }));

    mcp.server.registerCapabilities({tools: {listChanged: false}});

    mcp.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: toolList
    }));

    mcp.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
        const tool = byName.get(request.params.name);

        if (tool === undefined) {
            return {
                content: [{type: 'text', text: `Unknown tool: ${request.params.name}`}],
                isError: true
            };
        }

        const args = request.params.arguments ?? {};
        const errors: SchemaErrors = [];

        if (!tool.inputSchema.validate(args, errors)) {
            return {
                content: [{
                    type: 'text',
                    text: `Invalid arguments for ${tool.name}: ${JSON.stringify(errors)}`
                }],
                isError: true
            };
        }

        try {
            return await tool.handler(args);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{type: 'text', text: message}],
                isError: true
            };
        }
    });
}