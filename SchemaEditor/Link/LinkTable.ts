import {BaseTable, BaseTableOnDelete} from '../Base/BaseTable.js';
import {EditorIcons} from '../Base/EditorIcons.js';
import {JsonLinkDescription, JsonSchemaPositionDescription} from '../JsonData.js';

/**
 * Link table on delete
 * @param table
 * @constructor
 */
export const LinkTableOnDelete: BaseTableOnDelete = (table: BaseTable) => {
    window.dispatchEvent(new CustomEvent('schemaeditor:deletelinktable', {
        detail: {
            id: table.getUnid()
        }
    }));
};

/**
 * Link table
 */
export class LinkTable {

    /**
     * Unid
     * @protected
     */
    protected _unid: string = '';

    /**
     * Grid position
     * @protected
     */
    protected _position: JsonSchemaPositionDescription = {
        x: 0,
        y: 0
    };

    /**
     * Link unid
     * @protected
     */
    protected _linkUnid: string = '';

    /**
     * link object
     * @protected
     */
    protected _linkObject: BaseTable|null = null;

    /**
     * constructor
     * @param {string} unid
     * @param {string} linkUnid
     * @param {BaseTable|null} linkObject
     */
    public constructor(unid: string, linkUnid: string, linkObject: BaseTable|null = null) {
        this._unid = unid;
        this._linkUnid = linkUnid;

        if (linkObject) {
            this.setLinkObject(linkObject);
        }
    }

    /**
     * Return the unid
     * @return {string}
     */
    public getUnid(): string {
        return this._unid;
    }

    /**
     * Link unid
     * @return {string}
     */
    public getLinkUnid(): string {
        return this._linkUnid;
    }

    /**
     * Return the link object unid
     * @return {string|null}
     */
    public getLinkObjectUnid(): string|null {
        return this._linkObject?.getUnid() ?? null;
    }

    /**
     * Set link object
     * @param {BaseTable} linkObject
     */
    public setLinkObject(linkObject: BaseTable): void {
        this._linkUnid = linkObject.getUnid();
        this._linkObject = linkObject;
        this._linkObject.setOnPositionMove((table, offsetTop, offsetLeft) => {
            this.setPosition(offsetLeft, offsetTop);

            window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
        });

        this._linkObject.getElement().classList.add('vts-link-table');
        this._linkObject.getHeadlineElement().classList.add('vts-element-link-name');
        this._linkObject.getIconElement().textContent = EditorIcons.link;
    }

    /**
     * Set Position of table
     * @param {number} x
     * @param {number} y
     */
    public setPosition(x: number, y: number): void {
        this._position.x = x;
        this._position.y = y;

        if (this._linkObject) {
            this._linkObject.getElement().style.left = `${x}px`;
            this._linkObject.getElement().style.top = `${y}px`;
        }
    }

    /**
     * Return the element
     * @return {HTMLElement|null}
     */
    public getElement(): HTMLElement|null {
        return this._linkObject?.getElement() ?? null;
    }

    /**
     * Update view
     */
    public updateView(): void {
        if (this._linkObject) {
            this._linkObject.getElement().style.top = `${this._position.y}px`;
            this._linkObject.getElement().style.left = `${this._position.x}px`;
            this._linkObject.getElement().classList.remove('selected');

            if (!this._linkObject.getHeadlineElement().classList.contains('vts-element-link-name')) {
                this._linkObject.getHeadlineElement().classList.add('vts-element-link-name')
            }

            if (!this._linkObject.getElement().classList.contains('vts-link-table')) {
                this._linkObject.getElement().classList.add('vts-link-table')
            }

            this._linkObject.getIconElement().textContent = EditorIcons.link;
            this._linkObject.setOnDelete(LinkTableOnDelete);
            this._linkObject.updateConnection();
        }
    }

    /**
     * Return the link object
     * @return {BaseTable|null}
     */
    public getLinkObject(): BaseTable|null {
        return this._linkObject;
    }

    /**
     * Return the Data
     * @return {JsonLinkDescription}
     */
    public getData(): JsonLinkDescription {
        return {
            unid: this._unid,
            pos: this._position,
            link_unid: this._linkObject?.getUnid() ?? this._linkUnid
        };
    }

    /**
     * Set data
     * @param {JsonLinkDescription} data
     */
    public setData(data: JsonLinkDescription): void {
        this._unid = data.unid;
        this._position = data.pos;
        this._linkUnid = data.link_unid;
    }

}