/**
 * PluginBridge — WebSocket client that receives CustomEvent payloads pushed
 * by the IDE plugin (via POST /api/push-event on the dev server) and
 * re-dispatches them on `window`. The editor previously ran inside a JCEF
 * panel where the plugin called `executeJavaScript` to fire CustomEvents
 * directly; with the editor now running in a regular browser tab, the same
 * payloads travel over WebSocket instead. The event contract
 * (`schemaeditor:invokeschema`, `schemaeditor:validateschema`, …) is
 * unchanged so existing listeners keep working.
 */
export class PluginBridge {

    private static readonly PATH = '/ws/plugin';
    private static readonly INITIAL_BACKOFF_MS = 500;
    private static readonly MAX_BACKOFF_MS = 10_000;

    private _socket: WebSocket|null = null;
    private _backoffMs = PluginBridge.INITIAL_BACKOFF_MS;
    private _stopped = false;

    public start(): void {
        this._stopped = false;
        this._connect();
    }

    public stop(): void {
        this._stopped = true;
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
    }

    private _connect(): void {
        if (this._stopped) {
            return;
        }

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${proto}//${window.location.host}${PluginBridge.PATH}`;

        let socket: WebSocket;

        try {
            socket = new WebSocket(url);
        } catch (e) {
            console.warn('PluginBridge: failed to create WebSocket', e);
            this._scheduleReconnect();
            return;
        }

        this._socket = socket;

        socket.addEventListener('open', () => {
            this._backoffMs = PluginBridge.INITIAL_BACKOFF_MS;
        });

        socket.addEventListener('message', (ev) => {
            let parsed: unknown;

            try {
                parsed = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
            } catch {
                return;
            }

            if (!parsed || typeof parsed !== 'object') {
                return;
            }

            const msg = parsed as {event?: unknown; detail?: unknown};

            if (typeof msg.event !== 'string' || msg.event.length === 0) {
                return;
            }

            window.dispatchEvent(new CustomEvent(msg.event, {detail: msg.detail}));
        });

        socket.addEventListener('close', () => {
            this._socket = null;
            this._scheduleReconnect();
        });

        // 'error' is followed by 'close' on most browsers; close handles
        // reconnect, so the only thing to do here is log for visibility.
        socket.addEventListener('error', () => {
            // intentionally quiet — Chrome already logs the failed handshake
        });
    }

    private _scheduleReconnect(): void {
        if (this._stopped) {
            return;
        }
        const delay = this._backoffMs;
        this._backoffMs = Math.min(this._backoffMs * 2, PluginBridge.MAX_BACKOFF_MS);
        window.setTimeout(() => this._connect(), delay);
    }

}