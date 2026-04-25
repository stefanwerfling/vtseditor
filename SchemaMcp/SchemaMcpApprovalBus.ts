import crypto from 'crypto';
import {ConfigMcpPolicyAction} from '../Config/Config.js';
import {SchemaMcpLogger} from './SchemaMcpLogger.js';

/**
 * Scope of a "remember this decision" choice made by the user.
 * `session` survives until the Vite dev server restarts; `forever`
 * also persists into `vtseditor.json` so the rule applies to every
 * future process and every MCP client.
 */
export type McpApprovalRemember = 'session'|'forever';

/**
 * Event emitted on the approval SSE channel when a new tool call is
 * waiting for user confirmation.
 */
export type McpApprovalRequestEvent = {
    type: 'request';
    requestId: string;
    tool: string;
    args: unknown;
    createdAt: number;
    expiresAt: number;
};

/**
 * Event emitted when a pending request has been decided (by user,
 * timeout, or shutdown). Other tabs use it to close their dialog.
 */
export type McpApprovalResolvedEvent = {
    type: 'resolved';
    requestId: string;
    allow: boolean;
    reason: 'user'|'timeout'|'duplicate';
};

export type McpApprovalEvent = McpApprovalRequestEvent|McpApprovalResolvedEvent;

export type McpApprovalListener = (event: McpApprovalEvent) => void;

/**
 * Optional hook invoked when the user picked `remember: 'forever'` for
 * a tool. The persister writes the rule to `vtseditor.json`; the bus
 * stays persistence-agnostic so it can be unit-tested without a real
 * config file.
 */
export type McpApprovalForeverPersister = (
    toolName: string,
    action: ConfigMcpPolicyAction.allow|ConfigMcpPolicyAction.deny
) => Promise<void>|void;

type Pending = {
    request: McpApprovalRequestEvent;
    resolve: (allow: boolean) => void;
    timer: NodeJS.Timeout;
};

/**
 * In-memory bus for MCP tool-call approvals. The MCP gate calls
 * {@link request} and awaits the returned promise; the HTTP layer
 * subscribes via {@link subscribe} to forward events to SSE listeners
 * and calls {@link decide} when the user confirms or rejects.
 *
 * Timeouts auto-resolve to `deny` so a client that closed the editor
 * tab cannot wedge the MCP server on a pending tool call.
 */
export class McpApprovalBus {

    private readonly _pending = new Map<string, Pending>();
    private readonly _listeners = new Set<McpApprovalListener>();
    private readonly _defaultTimeoutMs: number;

    /**
     * Per-tool override granted by the user at runtime. `session` or
     * `forever` decisions both populate this map; `forever` additionally
     * calls the persister. Overrides take precedence over the compiled
     * policy — a gate check uses {@link getSessionOverride} first.
     */
    private readonly _sessionOverrides =
        new Map<string, ConfigMcpPolicyAction.allow|ConfigMcpPolicyAction.deny>();

    private _persister: McpApprovalForeverPersister|null = null;
    private _logger: SchemaMcpLogger|null = null;

    public constructor(defaultTimeoutMs = 60_000) {
        this._defaultTimeoutMs = defaultTimeoutMs;
    }

    public setForeverPersister(persister: McpApprovalForeverPersister): void {
        this._persister = persister;
    }

    public setLogger(logger: SchemaMcpLogger): void {
        this._logger = logger;
    }

    /**
     * Starts an approval flow. Returns a promise that resolves to `true`
     * when the user allows the call, `false` when the user denies or
     * the timeout expires.
     */
    public request(tool: string, args: unknown, timeoutMs?: number): Promise<boolean> {
        const requestId = crypto.randomUUID();
        const now = Date.now();
        const ttl = timeoutMs ?? this._defaultTimeoutMs;

        const event: McpApprovalRequestEvent = {
            type: 'request',
            requestId,
            tool,
            args,
            createdAt: now,
            expiresAt: now + ttl
        };

        return new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => {
                this._resolveInternal(requestId, false, 'timeout');
            }, ttl);

            this._pending.set(requestId, {request: event, resolve, timer});
            this._logger?.log('approval_request', {requestId, tool, args, ttlMs: ttl});
            this._emit(event);
        });
    }

    /**
     * User / HTTP layer decides a pending request. Unknown ids are
     * silently ignored so late clicks don't crash the server.
     *
     * `remember='session'` stores the decision in the in-memory
     * override map so the same tool skips approval for the rest of
     * the server's lifetime. `remember='forever'` additionally invokes
     * the registered persister (which writes a rule to `vtseditor.json`).
     */
    public async decide(
        requestId: string,
        allow: boolean,
        remember?: McpApprovalRemember
    ): Promise<boolean> {
        const entry = this._pending.get(requestId);

        if (entry === undefined) {
            return false;
        }

        const toolName = entry.request.tool;
        const action = allow ? ConfigMcpPolicyAction.allow : ConfigMcpPolicyAction.deny;

        if (remember === 'session' || remember === 'forever') {
            this._sessionOverrides.set(toolName, action);
            this._logger?.log('approval_override_set', {tool: toolName, action, scope: remember});
        }

        if (remember === 'forever' && this._persister) {
            try {
                await this._persister(toolName, action);
                this._logger?.log('approval_persisted', {tool: toolName, action});
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`McpApprovalBus: persister failed for ${toolName}:`, err);
                this._logger?.log('approval_persist_failed', {tool: toolName, action, error: message});
                // Fall through — the session override still applies so
                // the user isn't re-prompted this session even if disk
                // persistence failed.
            }
        }

        this._logger?.log('approval_decided', {requestId, tool: toolName, allow, remember: remember ?? null});

        return this._resolveInternal(requestId, allow, 'user');
    }

    public getSessionOverride(
        toolName: string
    ): ConfigMcpPolicyAction.allow|ConfigMcpPolicyAction.deny|undefined {
        return this._sessionOverrides.get(toolName);
    }

    /**
     * Subscribe to approval events. Returns an unsubscribe function.
     * New subscribers also get a snapshot of currently-pending
     * requests so late-joining tabs can render their dialogs.
     */
    public subscribe(listener: McpApprovalListener): () => void {
        this._listeners.add(listener);

        for (const {request} of this._pending.values()) {
            listener(request);
        }

        return (): void => {
            this._listeners.delete(listener);
        };
    }

    /**
     * Returns the currently pending requests — used by the SSE handler
     * to seed newly-opened streams.
     */
    public snapshot(): readonly McpApprovalRequestEvent[] {
        return Array.from(this._pending.values(), (p) => p.request);
    }

    private _resolveInternal(
        requestId: string,
        allow: boolean,
        reason: McpApprovalResolvedEvent['reason']
    ): boolean {
        const entry = this._pending.get(requestId);

        if (entry === undefined) {
            return false;
        }

        clearTimeout(entry.timer);
        this._pending.delete(requestId);
        entry.resolve(allow);

        if (reason === 'timeout') {
            this._logger?.log('approval_timeout', {requestId, tool: entry.request.tool});
        }

        this._emit({type: 'resolved', requestId, allow, reason});

        return true;
    }

    private _emit(event: McpApprovalEvent): void {
        for (const listener of this._listeners) {
            try {
                listener(event);
            } catch (err) {
                console.error('McpApprovalBus listener error:', err);
            }
        }
    }

}