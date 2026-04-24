import {
    SCHEMA_REPOSITORY_EVENT_OPS,
    SchemaRepositoryEvent
} from '../../SchemaRepository/SchemaRepositoryEventTypes.js';

export type SchemaSseEventListener = (event: SchemaRepositoryEvent) => void;
export type SchemaSseResyncListener = () => void;
export type SchemaSseOpenListener = () => void;
export type SchemaSseErrorListener = (error: Event) => void;

/**
 * Browser-side wrapper around the project's SSE stream
 * (`GET /api/projects/:pid/events`).
 *
 * Register callbacks via the `on…` setters, then call {@link connect}. The
 * native `EventSource` handles low-level reconnect and re-sends the
 * `Last-Event-ID` header on its own; this wrapper tracks the last seen `rev`
 * so a manual {@link reconnect} or a fresh {@link connect} after
 * {@link setBaseline} uses `?last_event_id=` to resume.
 *
 * A server-sent `event: resync` triggers {@link onResync} — the client must
 * refetch the full state because its baseline has dropped out of the server's
 * replay buffer.
 */
export class SchemaSseClient {

    private readonly _projectUnid: string;
    private _es: EventSource|null = null;
    private _lastEventId = 0;
    private _onEvent: SchemaSseEventListener|null = null;
    private _onResync: SchemaSseResyncListener|null = null;
    private _onOpen: SchemaSseOpenListener|null = null;
    private _onError: SchemaSseErrorListener|null = null;

    public constructor(projectUnid: string) {
        this._projectUnid = projectUnid;
    }

    public onEvent(cb: SchemaSseEventListener): this {
        this._onEvent = cb;
        return this;
    }

    public onResync(cb: SchemaSseResyncListener): this {
        this._onResync = cb;
        return this;
    }

    public onOpen(cb: SchemaSseOpenListener): this {
        this._onOpen = cb;
        return this;
    }

    public onError(cb: SchemaSseErrorListener): this {
        this._onError = cb;
        return this;
    }

    /**
     * Records the highest `rev` the client currently trusts. Next connect
     * (or reconnect) will request events after this baseline via
     * `?last_event_id=`.
     */
    public setBaseline(rev: number): this {
        this._lastEventId = rev;
        return this;
    }

    public getLastEventId(): number {
        return this._lastEventId;
    }

    public connect(): void {
        if (this._es !== null) {
            return;
        }

        const query = this._lastEventId > 0
            ? `?last_event_id=${this._lastEventId}`
            : '';

        const url = `/api/projects/${this._projectUnid}/events${query}`;
        const es = new EventSource(url);

        es.onopen = (): void => {
            this._onOpen?.();
        };

        es.onerror = (ev: Event): void => {
            this._onError?.(ev);
        };

        // EventSource only triggers its default `message` handler for
        // unnamed events. Our server uses one named event per op, so we
        // register a listener for every op name.
        for (const op of SCHEMA_REPOSITORY_EVENT_OPS) {
            es.addEventListener(op, (raw: MessageEvent): void => {
                this._handleEvent(raw);
            });
        }

        es.addEventListener('resync', (): void => {
            this._onResync?.();
        });

        this._es = es;
    }

    public close(): void {
        if (this._es === null) {
            return;
        }

        this._es.close();
        this._es = null;
    }

    /**
     * Force-closes the current connection and opens a new one using the
     * current `lastEventId` as baseline. Useful after a {@link onResync}
     * callback has refetched the tree and now wants the live stream to
     * resume from the new baseline.
     */
    public reconnect(): void {
        this.close();
        this.connect();
    }

    private _handleEvent(raw: MessageEvent): void {
        let parsed: SchemaRepositoryEvent;

        try {
            parsed = JSON.parse(raw.data) as SchemaRepositoryEvent;
        } catch (e) {
            console.warn('SchemaSseClient: failed to parse event data', e);
            return;
        }

        if (typeof parsed.rev === 'number' && parsed.rev > this._lastEventId) {
            this._lastEventId = parsed.rev;
        }

        this._onEvent?.(parsed);
    }

}