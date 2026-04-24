/**
 * Event emitted on the approval SSE channel when a new MCP tool call
 * is waiting for user confirmation. Mirrors McpApprovalRequestEvent
 * from the backend.
 */
export type McpApprovalRequest = {
    type: 'request';
    requestId: string;
    tool: string;
    args: unknown;
    createdAt: number;
    expiresAt: number;
};

/**
 * Event emitted when a pending request has already been decided
 * (by a different tab, by timeout, ...). Used to close stale
 * dialogs.
 */
export type McpApprovalResolved = {
    type: 'resolved';
    requestId: string;
    allow: boolean;
    reason: 'user'|'timeout'|'duplicate';
};

export type McpApprovalRequestListener = (event: McpApprovalRequest) => void;
export type McpApprovalResolvedListener = (event: McpApprovalResolved) => void;

/**
 * Scope of a "remember" choice. Matches `McpApprovalRemember` on
 * the backend. `session` caches the decision in-memory on the
 * server; `forever` additionally patches `vtseditor.json`.
 */
export type McpApprovalRemember = 'session'|'forever';

/**
 * Browser-side wrapper around the MCP approval SSE stream
 * (`GET /api/mcp/approvals/events`) and the decision endpoint
 * (`POST /api/mcp/approvals/:requestId`).
 *
 * Connect once at app start. The backend registers the endpoint
 * only when `mcp.enabled` is set — connection errors on disabled
 * installs are silent and self-limiting via {@link stopOnError}.
 */
export class SchemaMcpApprovalClient {

    private _es: EventSource|null = null;
    private _onRequest: McpApprovalRequestListener|null = null;
    private _onResolved: McpApprovalResolvedListener|null = null;
    private _stopped = false;

    public onRequest(cb: McpApprovalRequestListener): this {
        this._onRequest = cb;
        return this;
    }

    public onResolved(cb: McpApprovalResolvedListener): this {
        this._onResolved = cb;
        return this;
    }

    public connect(): void {
        if (this._es !== null || this._stopped) {
            return;
        }

        const es = new EventSource('/api/mcp/approvals/events');

        es.addEventListener('approval_request', (raw: MessageEvent): void => {
            this._dispatch(raw, (ev): void => {
                this._onRequest?.(ev as McpApprovalRequest);
            });
        });

        es.addEventListener('approval_resolved', (raw: MessageEvent): void => {
            this._dispatch(raw, (ev): void => {
                this._onResolved?.(ev as McpApprovalResolved);
            });
        });

        // Give up after an initial failure. If MCP is disabled on the
        // server the endpoint 404s and EventSource would otherwise
        // reconnect forever.
        es.onerror = (): void => {
            if (es.readyState === EventSource.CLOSED) {
                this.stop();
            }
        };

        this._es = es;
    }

    public stop(): void {
        this._stopped = true;

        if (this._es !== null) {
            this._es.close();
            this._es = null;
        }
    }

    /**
     * POST the user's decision for a pending request. Returns `true`
     * when the server accepted it, `false` when the request was
     * unknown or already decided (e.g. a race with a second tab).
     *
     * `remember='session'` makes the server skip approval for the
     * same tool for the rest of its lifetime; `remember='forever'`
     * additionally writes the rule to `vtseditor.json`.
     */
    public async decide(
        requestId: string,
        allow: boolean,
        remember?: McpApprovalRemember
    ): Promise<boolean> {
        const payload: {allow: boolean; remember?: McpApprovalRemember} = {allow};

        if (remember !== undefined) {
            payload.remember = remember;
        }

        const response = await fetch(`/api/mcp/approvals/${encodeURIComponent(requestId)}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        return response.ok;
    }

    private _dispatch(raw: MessageEvent, callback: (ev: unknown) => void): void {
        try {
            callback(JSON.parse(raw.data));
        } catch (e) {
            console.warn('SchemaMcpApprovalClient: failed to parse event data', e);
        }
    }

}