import {EventEmitter} from 'events';
import {SchemaRepositoryEvent} from './SchemaRepositoryEventTypes.js';

export type {
    SchemaRepositoryEvent,
    SchemaRepositoryEventBody,
    SchemaRepositoryEventEnvelope,
    SchemaRepositoryEventOp
} from './SchemaRepositoryEventTypes.js';

/**
 * Per-project pub/sub with a bounded replay buffer.
 *
 * Subscribers get every event emitted after their `subscribe()` call.
 * `replaySince(rev)` returns all buffered events newer than `rev`, or `null`
 * if the caller's baseline has dropped out of the buffer (forcing a full
 * resync on the SSE endpoint).
 */
export class SchemaRepositoryEventBus {

    private readonly _emitter = new EventEmitter();
    private readonly _buffer: SchemaRepositoryEvent[] = [];
    private readonly _bufferSize: number;

    public constructor(bufferSize = 500) {
        this._bufferSize = bufferSize;
        // The only failure mode of exceeding the default 10-listener warning
        // is a transient log spam; real bound is the number of open SSE
        // clients which we do not want to cap here.
        this._emitter.setMaxListeners(0);
    }

    public publish(event: SchemaRepositoryEvent): void {
        this._buffer.push(event);

        if (this._buffer.length > this._bufferSize) {
            this._buffer.shift();
        }

        this._emitter.emit('event', event);
    }

    public subscribe(listener: (event: SchemaRepositoryEvent) => void): () => void {
        this._emitter.on('event', listener);
        return (): void => {
            this._emitter.off('event', listener);
        };
    }

    /**
     * Returns events with `rev > sinceRev`.
     *
     * Returns `null` when `sinceRev` is older than what the buffer still
     * holds — the subscriber lost events and must refetch state from scratch
     * before trusting further increments.
     */
    public replaySince(sinceRev: number): SchemaRepositoryEvent[]|null {
        if (this._buffer.length === 0) {
            return [];
        }

        const oldestRev = this._buffer[0].rev;

        // sinceRev === oldestRev - 1 is the lower bound of a clean resume:
        // the very next event after the client's baseline is still in the
        // buffer. Anything older has dropped off.
        if (sinceRev < oldestRev - 1) {
            return null;
        }

        return this._buffer.filter((e) => e.rev > sinceRev);
    }

    public getLatestRev(): number {
        if (this._buffer.length === 0) {
            return 0;
        }

        return this._buffer[this._buffer.length - 1].rev;
    }

}