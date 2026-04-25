import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    CallToolRequestSchema,
    CallToolResult,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import {ExtractSchemaResultType, Schema, SchemaErrors} from 'vts';
import {ConfigMcpPolicyAction} from '../Config/Config.js';
import {SchemaMcpLogger} from './SchemaMcpLogger.js';
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
    logger?: SchemaMcpLogger;
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
    const logger = options.logger;

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
    const hiddenTools: string[] = [];

    for (const t of tools) {
        const action = options.decide ? options.decide(t.name) : ConfigMcpPolicyAction.allow;

        if (action === ConfigMcpPolicyAction.deny) {
            hiddenTools.push(t.name);
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

    logger?.log('tools_registered', {
        advertised: toolList.map((t) => t.name),
        hidden: hiddenTools
    });

    mcp.server.registerCapabilities({tools: {listChanged: false}});

    mcp.server.setRequestHandler(ListToolsRequestSchema, async () => {
        logger?.log('tools_list', {count: toolList.length});
        return {tools: toolList};
    });

    mcp.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
        const startedAt = Date.now();
        const tool = byName.get(request.params.name);

        if (tool === undefined) {
            logger?.log('tool_unknown', {tool: request.params.name});
            return {
                content: [{type: 'text', text: `Unknown tool: ${request.params.name}`}],
                isError: true
            };
        }

        const args = request.params.arguments ?? {};
        const errors: SchemaErrors = [];

        if (!tool.inputSchema.validate(args, errors)) {
            logger?.log('tool_invalid_args', {tool: tool.name, args, errors});
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
        const policyAction = options.decide ? options.decide(tool.name) : ConfigMcpPolicyAction.allow;
        const action = override ?? policyAction;

        logger?.log('tool_call', {
            tool: tool.name,
            args,
            policy: policyAction,
            override: override ?? null,
            action
        });

        if (action === ConfigMcpPolicyAction.deny) {
            logger?.log('tool_denied', {
                tool: tool.name,
                reason: override === ConfigMcpPolicyAction.deny ? 'remembered' : 'policy',
                durationMs: Date.now() - startedAt
            });
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
            logger?.log('tool_approval_requested', {tool: tool.name});

            const approved = options.onApprovalRequest
                ? await options.onApprovalRequest(tool.name, args)
                : false;

            logger?.log('tool_approval_resolved', {tool: tool.name, approved});

            if (!approved) {
                logger?.log('tool_denied', {
                    tool: tool.name,
                    reason: 'not_approved',
                    durationMs: Date.now() - startedAt
                });
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
            const result = await tool.handler(args);
            logger?.log('tool_result', {
                tool: tool.name,
                ok: result.isError !== true,
                durationMs: Date.now() - startedAt
            });
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger?.log('tool_error', {
                tool: tool.name,
                error: message,
                durationMs: Date.now() - startedAt
            });
            return {
                content: [{type: 'text', text: message}],
                isError: true
            };
        }
    });
}