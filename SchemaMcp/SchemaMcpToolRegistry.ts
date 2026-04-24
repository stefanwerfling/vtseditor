import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    CallToolRequestSchema,
    CallToolResult,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import {ExtractSchemaResultType, Schema, SchemaErrors} from 'vts';
import {ConfigMcpPolicyAction} from '../Config/Config.js';
import {McpPolicyDecide} from './SchemaMcpPolicy.js';
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
 * Optional extension point for the policy gate. When a tool resolves to
 * `ask` the registry calls this callback; it should return `true` to
 * allow the call through or `false` to reject it. Phase 1 ships with no
 * approval UI — the default behaviour without a handler is to deny.
 */
export type McpApprovalHandler = (toolName: string, args: unknown) => Promise<boolean>;

/**
 * Looks up a user-granted override for a tool (remember=session /
 * remember=forever). Returns `allow` to short-circuit the gate with
 * success, `deny` to short-circuit with failure, or `undefined` to
 * fall through to the regular policy decision.
 */
export type McpSessionOverrideLookup = (toolName: string) =>
    ConfigMcpPolicyAction.allow|ConfigMcpPolicyAction.deny|undefined;

/**
 * Options for {@link registerVtsMcpTools}. `decide` is the compiled
 * policy function (see {@link compileMcpPolicy}); when omitted every
 * call is allowed so existing callers keep their previous behaviour.
 */
export type RegisterVtsMcpToolsOptions = {
    decide?: McpPolicyDecide;
    onApprovalRequest?: McpApprovalHandler;
    getSessionOverride?: McpSessionOverrideLookup;
};

/**
 * Register a set of VTS-schema-typed MCP tools on an McpServer,
 * bypassing {@link McpServer.registerTool} (which is hard-bound to zod).
 * We wire `tools/list` and `tools/call` handlers directly onto the
 * underlying {@link Server} so our own code stays zod-free — the SDK
 * keeps zod only as a transitive dep for its own request schemas.
 */
export function registerVtsMcpTools(
    mcp: McpServer,
    tools: readonly VtsMcpTool[],
    options: RegisterVtsMcpToolsOptions = {}
): void {
    const byName = new Map<string, VtsMcpTool>();

    for (const tool of tools) {
        if (byName.has(tool.name)) {
            throw new Error(`Duplicate MCP tool name: ${tool.name}`);
        }

        byName.set(tool.name, tool);
    }

    // Compute JSON Schemas once — tool definitions are static over the
    // life of the server and `describe()` walks the whole schema tree.
    // Policy-hidden tools are filtered here as UX/defense-in-depth; the
    // gate in the call handler remains authoritative.
    type ListedTool = {name: string; description: string; inputSchema: JsonSchemaNode};

    const toolList: ListedTool[] = [];

    for (const t of tools) {
        const action = options.decide ? options.decide(t.name) : ConfigMcpPolicyAction.allow;

        if (action === ConfigMcpPolicyAction.deny) {
            continue;
        }

        const description = action === ConfigMcpPolicyAction.ask
            ? `⚠ Requires user approval — ${t.description}`
            : t.description;

        toolList.push({
            name: t.name,
            description,
            inputSchema: vtsDescriptionToJsonSchema(t.inputSchema.describe() as never)
        });
    }

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

        // Policy gate — sits between args validation and handler so that
        // schema errors surface regardless of policy, and so handlers
        // never see a blocked call.
        const override = options.getSessionOverride?.(tool.name);
        const action = override
            ?? (options.decide ? options.decide(tool.name) : ConfigMcpPolicyAction.allow);

        if (action === ConfigMcpPolicyAction.deny) {
            return {
                content: [{
                    type: 'text',
                    text: override === ConfigMcpPolicyAction.deny
                        ? `Tool '${tool.name}' denied by remembered user decision.`
                        : `Tool '${tool.name}' denied by policy.`
                }],
                isError: true
            };
        }

        if (action === ConfigMcpPolicyAction.ask) {
            const approved = options.onApprovalRequest
                ? await options.onApprovalRequest(tool.name, args)
                : false;

            if (!approved) {
                return {
                    content: [{
                        type: 'text',
                        text: `Tool '${tool.name}' requires user approval and was not confirmed.`
                    }],
                    isError: true
                };
            }
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