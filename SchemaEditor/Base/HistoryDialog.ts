import {JsonEnumDescription, JsonHistoryEntryWithChange, JsonSchemaDescription, SchemaJsonHistoryKind} from '../JsonData.js';
import {SchemaApiClient, SchemaApiError} from '../Api/SchemaApiClient.js';
import {SchemaEditor} from '../SchemaEditor.js';
import {AlertDialog, AlertDialogTypes} from './AlertDialog.js';
import {BaseDialog} from './BaseDialog.js';
import {ConfirmDialog} from './ConfirmDialog.js';
import {EditorIcons} from './EditorIcons.js';
import './HistoryDialog.css';

export type HistoryDialogKind = 'schema'|'enum';

/**
 * Modal that lists the persisted history for one schema or enum and
 * lets the user restore an earlier snapshot.
 *
 * History is fetched on `show()` so the dialog is always up to date
 * with the latest server state — opening it twice in a row picks up
 * snapshots created by an edit made between the two opens.
 */
export class HistoryDialog extends BaseDialog {

    private readonly _kind: HistoryDialogKind;
    private readonly _unid: string;
    private readonly _name: string;
    private readonly _client: SchemaApiClient;

    private _listEl: HTMLDivElement;
    private _emptyEl: HTMLDivElement;
    private _limitEl: HTMLDivElement;

    public constructor(
        kind: HistoryDialogKind,
        unid: string,
        name: string,
        client: SchemaApiClient
    ) {
        super();

        this._kind = kind;
        this._unid = unid;
        this._name = name;
        this._client = client;

        this.setDialogTitle(`History — ${name}`);
        this._dialog.classList.add('history-dialog');

        const hint = document.createElement('div');
        hint.classList.add('history-dialog-hint');
        hint.textContent = kind === 'schema'
            ? 'Each row is a snapshot captured right before a save that changed this schema. Restore replaces the current version; the current version becomes the newest snapshot on the next save.'
            : 'Each row is a snapshot captured right before a save that changed this enum. Restore replaces the current version; the current version becomes the newest snapshot on the next save.';

        this._divBody.appendChild(hint);

        this._listEl = document.createElement('div');
        this._listEl.classList.add('history-dialog-list');
        this._divBody.appendChild(this._listEl);

        this._emptyEl = document.createElement('div');
        this._emptyEl.classList.add('history-dialog-empty');
        this._emptyEl.textContent = 'Loading…';
        this._divBody.appendChild(this._emptyEl);

        this._limitEl = document.createElement('div');
        this._limitEl.classList.add('history-dialog-limit');
        this._divBody.appendChild(this._limitEl);

        // History is read-only — confirm flow lives per row.
        this._btnConfirm.style.display = 'none';
        this._btnCancel.textContent = 'Close';
    }

    public override show(modal: boolean = true): void {
        super.show(modal);
        void this._loadHistory();
    }

    private async _loadHistory(): Promise<void> {
        this._listEl.innerHTML = '';
        this._emptyEl.style.display = '';
        this._emptyEl.textContent = 'Loading…';
        this._limitEl.textContent = '';

        try {
            const res = this._kind === 'schema'
                ? await this._client.getSchemaHistory(this._unid)
                : await this._client.getEnumHistory(this._unid);

            const listing = res.data;

            if (!listing) {
                this._emptyEl.textContent = 'No history available.';
                return;
            }

            this._limitEl.textContent = `Keeping up to ${listing.limit} snapshots per item.`;

            if (listing.history.length === 0) {
                this._emptyEl.textContent = 'No snapshots yet — make a change and save to start the history.';
                return;
            }

            this._emptyEl.style.display = 'none';

            for (const entry of listing.history) {
                this._listEl.appendChild(this._renderRow(entry));
            }
        } catch (e) {
            const msg = e instanceof SchemaApiError ? e.message : String(e);
            this._emptyEl.textContent = `Failed to load history: ${msg}`;
        }
    }

    private _renderRow(entry: JsonHistoryEntryWithChange): HTMLDivElement {
        const row = document.createElement('div');
        row.classList.add('history-dialog-row');

        row.appendChild(this._renderChangeBadges(entry));

        const meta = document.createElement('div');
        meta.classList.add('history-dialog-row-meta');

        const ts = document.createElement('div');
        ts.classList.add('history-dialog-row-ts');
        ts.textContent = HistoryDialog._formatAbsolute(entry.ts);
        meta.appendChild(ts);

        const rel = document.createElement('div');
        rel.classList.add('history-dialog-row-rel');
        rel.textContent = HistoryDialog._formatRelative(entry.ts);
        meta.appendChild(rel);

        const summary = document.createElement('div');
        summary.classList.add('history-dialog-row-summary');
        summary.textContent = this._summarize(entry);
        meta.appendChild(summary);

        row.appendChild(meta);

        const actions = document.createElement('div');
        actions.classList.add('history-dialog-row-actions');

        const btnRestore = document.createElement('button');
        btnRestore.classList.add('history-dialog-row-btn');
        btnRestore.textContent = 'Restore';
        btnRestore.addEventListener('click', () => this._confirmRestore(entry));
        actions.appendChild(btnRestore);

        row.appendChild(actions);
        return row;
    }

    private _renderChangeBadges(entry: JsonHistoryEntryWithChange): HTMLDivElement {
        const wrap = document.createElement('div');
        wrap.classList.add('history-dialog-row-badges');

        const unitLabel = entry.kind === SchemaJsonHistoryKind.schema ? 'field' : 'value';
        const {added, removed, modified, topLevel} = entry.changes;
        const noChange = added === 0 && removed === 0 && modified === 0 && !topLevel;

        if (noChange) {
            wrap.appendChild(HistoryDialog._badge('🟰', '', 'noop', 'No diff vs next state'));
            return wrap;
        }

        if (added > 0) {
            wrap.appendChild(HistoryDialog._badge(
                EditorIcons.add,
                String(added),
                'added',
                `${added} ${unitLabel}${added === 1 ? '' : 's'} added afterwards`
            ));
        }

        if (removed > 0) {
            wrap.appendChild(HistoryDialog._badge(
                EditorIcons.delete,
                String(removed),
                'removed',
                `${removed} ${unitLabel}${removed === 1 ? '' : 's'} removed afterwards`
            ));
        }

        if (modified > 0) {
            wrap.appendChild(HistoryDialog._badge(
                EditorIcons.edit,
                String(modified),
                'modified',
                `${modified} ${unitLabel}${modified === 1 ? '' : 's'} modified afterwards`
            ));
        }

        if (topLevel) {
            wrap.appendChild(HistoryDialog._badge(
                EditorIcons.info,
                '',
                'top-level',
                entry.kind === SchemaJsonHistoryKind.schema
                    ? 'Name, description, or extend changed afterwards'
                    : 'Name or description changed afterwards'
            ));
        }

        return wrap;
    }

    private static _badge(icon: string, count: string, variant: string, title: string): HTMLSpanElement {
        const el = document.createElement('span');
        el.classList.add('history-dialog-badge', `history-dialog-badge-${variant}`);
        el.title = title;

        const ico = document.createElement('span');
        ico.classList.add('history-dialog-badge-icon');
        ico.textContent = icon;
        el.appendChild(ico);

        if (count !== '') {
            const cnt = document.createElement('span');
            cnt.classList.add('history-dialog-badge-count');
            cnt.textContent = count;
            el.appendChild(cnt);
        }

        return el;
    }

    private _summarize(entry: JsonHistoryEntryWithChange): string {
        if (entry.kind === SchemaJsonHistoryKind.schema) {
            const snap = entry.snapshot as JsonSchemaDescription;
            const fieldCount = Array.isArray(snap?.fields) ? snap.fields.length : 0;
            const name = typeof snap?.name === 'string' ? snap.name : '(unnamed)';
            return `Name: ${name}, ${fieldCount} field${fieldCount === 1 ? '' : 's'}`;
        }

        const snap = entry.snapshot as JsonEnumDescription;
        const valueCount = Array.isArray(snap?.values) ? snap.values.length : 0;
        const name = typeof snap?.name === 'string' ? snap.name : '(unnamed)';
        return `Name: ${name}, ${valueCount} value${valueCount === 1 ? '' : 's'}`;
    }

    private _confirmRestore(entry: JsonHistoryEntryWithChange): void {
        const when = HistoryDialog._formatAbsolute(entry.ts);

        ConfirmDialog.showConfirm(
            'Restore snapshot',
            `Replace the current ${this._kind} "${this._name}" with the snapshot from ${when}? The current version will become the newest snapshot on the next save.`,
            () => void this._restore(entry),
            AlertDialogTypes.warning,
            this
        );
    }

    private async _restore(entry: JsonHistoryEntryWithChange): Promise<void> {
        try {
            if (this._kind === 'schema') {
                await this._client.restoreSchemaHistory(this._unid, entry.ts);
            } else {
                await this._client.restoreEnumHistory(this._unid, entry.ts);
            }

            this.destroy();

            // The mutation echoes back with our own clientId, so the
            // SSE listener skips it — we have to manually pull the
            // restored state into the canvas. loadData() re-fetches the
            // skeleton and rehydrates whichever file is currently open.
            const editor = SchemaEditor.getActive();

            if (editor !== null) {
                try {
                    await editor.loadData();
                } catch (err) {
                    console.warn('history restore reload failed', err);
                }
            }
        } catch (e) {
            const msg = e instanceof SchemaApiError ? e.message : String(e);
            AlertDialog.showAlert('Restore failed', msg, AlertDialogTypes.error, this);
        }
    }

    private static _formatAbsolute(ts: number): string {
        const d = new Date(ts);
        const pad = (n: number): string => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    private static _formatRelative(ts: number): string {
        const delta = Date.now() - ts;
        const sec = Math.round(delta / 1000);

        if (sec < 60) {
            return `${sec}s ago`;
        }

        const min = Math.round(sec / 60);

        if (min < 60) {
            return `${min} min ago`;
        }

        const hrs = Math.round(min / 60);

        if (hrs < 48) {
            return `${hrs}h ago`;
        }

        const days = Math.round(hrs / 24);
        return `${days}d ago`;
    }

}