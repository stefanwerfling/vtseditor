import {Connection} from '@jsplumb/browser-ui';
import {JsonSchemaPositionDescription} from '../JsonData.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import './BaseTable.css';
import {Wiggle} from './Wiggle.js';

/**
 * On delete table
 */
export type BaseTableOnDelete = (table: BaseTable) => void;

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

        this._spanTitle = document.createElement('span');
        this._spanTitle.textContent = name;
        this._headline.appendChild(this._spanTitle);

        this._table.appendChild(this._headline);
    }

    /**
     * Set connection Hover by element
     * @param hover
     * @protected
     */
    protected _setConnectionHoverByElement(hover: boolean) {
        const connections = jsPlumbInstance.getConnections() as Connection[];

        connections.forEach(conn => {
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
     * Remove all
     */
    public remove(): void {
        this._table.remove();
    }

}