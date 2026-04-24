import {Connection} from '@jsplumb/browser-ui';
import {SchemaEditorApiCall, SchemaEditorUpdateDataDetail} from '../Api/SchemaEditorApiCall.js';
import {JsonSchemaPositionDescription} from '../JsonData.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import './BaseTable.css';
import {ContextMenu, ContextMenuEntry} from './ContextMenu.js';
import {EditorEvents} from './EditorEvents.js';
import {EditorIcons} from './EditorIcons.js';
import {Wiggle} from './Wiggle.js';

/**
 * On delete table
 */
export type BaseTableOnDelete = (table: BaseTable) => void;

/**
 * On position move table
 */
export type BaseTableOnPositionMove = (table: BaseTable, offsetTop: number, offsetLeft: number) => void;

/**
 * Base table
 */
export class BaseTable {

    /**
     * Id
     * @protected
     */
    protected _unid: string = '';

    /**
     * Read only
     * @protected
     */
    protected _readOnly: boolean = false;

    /**
     * name
     * @protected
     */
    protected _name: string = '';

    /**
     * Grid position
     * @protected
     */
    protected _position: JsonSchemaPositionDescription = {
        x: 0,
        y: 0
    };

    /**
     * table
     * @protected
     */
    protected _table: HTMLDivElement;

    /**
     * headline
     * @protected
     */
    protected _headline: HTMLDivElement;

    /**
     * Button delete
     * @protected
     */
    protected _btnDelete: HTMLDivElement;

    /**
     * Span icon
     * @protected
     */
    protected _spanIcon: HTMLSpanElement;

    /**
     * Span title
     * @protected
     */
    protected _spanTitle: HTMLSpanElement;

    /**
     * on delete
     * @protected
     */
    protected _onDelete: BaseTableOnDelete|null = null;

    /**
     * on position move
     * @protected
     */
    protected _onPositionMove: BaseTableOnPositionMove|null = null;

    /**
     * Constructor
     * @param {string} unid
     * @param {string} name
     */
    public constructor(unid: string, name: string) {
        this._unid = unid;
        this._name = name;

        this._table = document.createElement('div');

        // -------------------------------------------------------------------------------------------------------------

        this._table.addEventListener('mouseenter', () => {
            this._setConnectionHoverByElement(true);
        });

        this._table.addEventListener('mouseleave', () => {
            this._setConnectionHoverByElement(false);
        });

        // -------------------------------------------------------------------------------------------------------------

        this._position = {
            x: 50 + Math.random() * 300,
            y: 50 + Math.random() * 500
        };

        // -------------------------------------------------------------------------------------------------------------

        this._headline = document.createElement('div');
        this._headline.classList.add(...['vts-schema-element-name']);

        // -------------------------------------------------------------------------------------------------------------

        const targetpoint = document.createElement('div');
        targetpoint.id = `targetpoint-${this._unid}`;
        targetpoint.style.position = 'absolute';
        targetpoint.style.left = '0px';

        this._headline.appendChild(targetpoint);

        // -------------------------------------------------------------------------------------------------------------

        this._btnDelete = document.createElement('div');
        this._btnDelete.title = 'Delete';
        this._btnDelete.classList.add(...['vts-schema-delete', 'vts-schema-delete-vertex']);
        this._btnDelete.addEventListener('click', () => {
            if (this._onDelete) {
                this._onDelete(this);
            }
        });

        this._headline.appendChild(this._btnDelete);

        // -------------------------------------------------------------------------------------------------------------

        this._spanIcon = document.createElement('span');
        this._spanIcon.classList.add('vts-schema-name-icon');
        this._headline.appendChild(this._spanIcon);

        this._spanTitle = document.createElement('span');
        this._spanTitle.textContent = name;
        this._headline.appendChild(this._spanTitle);

        this._table.appendChild(this._headline);
    }

    /**
     * init js plumb
     * @protected
     */
    protected _initJsPlumb(): void {
        jsPlumbInstance.manage(this._table);
        jsPlumbInstance.setDraggable(this._table, true);

        jsPlumbInstance.bind('drag:stop', (info) => {
            if (info.el === this._table) {
                if (this._onPositionMove !== null) {
                    this._onPositionMove(
                        this,
                        this._table.offsetTop,
                        this._table.offsetLeft
                    );
                } else {
                    // default
                    this._position.y = this._table.offsetTop;
                    this._position.x = this._table.offsetLeft;

                    const apiCall = this._buildPositionUpdateApiCall();

                    window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                        detail: apiCall ? {apiCall} : {}
                    }));
                }
            }
        });
    }

    /**
     * Subclasses override to describe the granular mutation for the drag-end
     * position persist. Default returns `null`, causing the bulk-save
     * fallback to run in {@link SchemaEditor}'s updateData listener.
     * @protected
     */
    protected _buildPositionUpdateApiCall(): SchemaEditorApiCall|null {
        return null;
    }

    /**
     * Set connection Hover by element
     * @param {boolean} hover
     * @protected
     */
    protected _setConnectionHoverByElement(hover: boolean) {
        this._getConnections().forEach(conn => {
            if (!conn.source || !conn.target) {
                return;
            }

            if (this._table.contains(conn.source) || this._table.contains(conn.target)) {
                if (hover) {
                    conn.addClass('hovered-connection');
                } else {
                    conn.removeClass('hovered-connection');
                }

                jsPlumbInstance.repaintEverything();
            }
        });
    }

    /**
     * Return the table unid
     * @return {string}
     */
    public getUnid(): string {
        return this._unid;
    }

    /**
     * Is table read only
     * @return {boolean}
     */
    public isReadOnly(): boolean {
        return this._readOnly;
    }

    /**
     * Set the read only
     * @param {boolean} readonly
     */
    public setReadOnly(readonly: boolean): void {
        this._readOnly = readonly;

        if (readonly) {
            this._btnDelete.style.display = 'none';
        } else {
            this._btnDelete.style.display = '';
        }
    }

    /**
     * Return the table name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Set name
     * @param {string} name
     */
    public setName(name: string): void {
        this._name = name;
        this._spanTitle.textContent = name;
    }

    /**
     * Return the Element from Table
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._table;
    }

    /**
     * Return the Headline element from table
     * @return {HTMLDivElement}
     */
    public getHeadlineElement(): HTMLDivElement {
        return this._headline;
    }

    /**
     * Return the icon element
     * @return {HTMLSpanElement}
     */
    public getIconElement(): HTMLSpanElement {
        return this._spanIcon;
    }

    /**
     * Set Position of table
     * @param {number} x
     * @param {number} y
     */
    public setPosition(x: number, y: number): void {
        this._position.x = x;
        this._position.y = y;
        this._table.style.left = `${x}px`;
        this._table.style.top = `${y}px`;
    }

    public getPosition(): JsonSchemaPositionDescription {
        return {x: this._position.x, y: this._position.y};
    }

    /**
     * Set activ view
     * @param {boolean} active
     */
    public setActivView(active: boolean): void {
        if (active) {
            this._table.classList.add('selected');
        } else {
            this._table.classList.remove('selected');
        }
    }

    /**
     * run wiggle
     */
    public runWiggle(): void {
        Wiggle.runWiggle(this._table);
    }

    /**
     * Set on delete
     * @param {BaseTableOnDelete|null} onDelete
     */
    public setOnDelete(onDelete: BaseTableOnDelete|null): void {
        this._onDelete = onDelete;
    }

    /**
     * Set on position move
     * @param {BaseTableOnPositionMove|null} onMove
     */
    public setOnPositionMove(onMove: BaseTableOnPositionMove|null): void {
        this._onPositionMove = onMove;
    }

    /**
     * Remove all
     */
    public remove(): void {
        this._table.remove();
    }

    /**
     * Update view
     */
    public updateView(): void {
        this._table.style.top = `${this._position.y}px`;
        this._table.style.left = `${this._position.x}px`;

        if (this._headline.classList.contains('vts-element-link-name')) {
            this._headline.classList.remove('vts-element-link-name')
        }

        if (this._table.classList.contains('vts-link-table')) {
            this._table.classList.remove('vts-link-table');
        }
    }

    public updateConnection(): void {
        // overwrite
    }

    /**
     * Return the context menu owned by this table, or null if the subclass
     * has no context menu (e.g. a plain BaseTable without actions). Used by
     * LinkTable to swap menu entries when this table is reused as a link.
     * @return {ContextMenu|null}
     */
    public getContextMenu(): ContextMenu|null {
        return null;
    }

    /**
     * Build the context-menu entries shown when this table is displayed as
     * a LinkTable (replacing the regular actions). Default is just "Remove
     * link"; SchemaTable overrides to prepend "Validate JSON".
     * @return {ContextMenuEntry[]}
     */
    public buildLinkModeItems(): ContextMenuEntry[] {
        return [
            {separator: true},
            {
                icon: EditorIcons.delete,
                label: 'Remove link',
                danger: true,
                onClick: () => {
                    if (this._onDelete) {
                        this._onDelete(this);
                    }
                }
            }
        ];
    }

    /**
     * return all connections
     * @return {Connection[]}
     * @protected
     */
    protected _getConnections(): Connection[] {
        return jsPlumbInstance.getConnections() as Connection[];
    }
}