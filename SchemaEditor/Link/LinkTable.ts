import {SchemaEditorUpdateDataDetail} from '../Api/SchemaEditorApiCall.js';
import {BaseTable, BaseTableOnDelete} from '../Base/BaseTable.js';
import {EditorEvents} from '../Base/EditorEvents.js';
import {JsonLinkDescription, JsonSchemaPositionDescription} from '../JsonData.js';

/**
 * Link table on delete
 * @param table
 * @constructor
 */
export const LinkTableOnDelete: BaseTableOnDelete = (table: BaseTable) => {
    window.dispatchEvent(new CustomEvent(EditorEvents.deleteLinkTable, {
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

            window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                detail: {
                    apiCall: {
                        op: 'link_update',
                        unid: this._unid,
                        patch: {pos: {x: this._position.x, y: this._position.y}}
                    }
                }
            }));
        });

        this._linkObject.getElement().classList.add('vts-link-table');
        this._linkObject.getHeadlineElement().classList.add('vts-element-link-name');
        // Keep the original icon (🧬 / 🧩) so the user can still tell whether
        // the link refers to a schema or an enum. The "LINK" chip and the
        // dashed violet border announce the link semantics separately.

        this._applyLinkReadOnly();
        this._applyLinkContextMenu();
    }

    /**
     * Force the wrapped table into read-only mode while it is presented as
     * a link — fields/values must not be edited, reordered, or removed
     * here; that has to happen in the table's home file. setReadOnly
     * cascades to fields and enum values, hiding their drag handles and
     * row context menus. The table-header context menu trigger is then
     * re-shown so the link-mode actions ("Validate JSON", "Remove link")
     * stay reachable.
     * @protected
     */
    protected _applyLinkReadOnly(): void {
        if (!this._linkObject) {
            return;
        }

        this._linkObject.setReadOnly(true);
        this._linkObject.getContextMenu()?.setTriggerVisible(true);
    }

    /**
     * Replace the wrapped table's context menu with link-only actions
     * (Validate JSON for schemas, Remove link for both). The regular
     * schema/enum actions do not apply to a link view.
     * @protected
     */
    protected _applyLinkContextMenu(): void {
        const menu = this._linkObject?.getContextMenu();

        if (menu && this._linkObject) {
            menu.setLinkMode(this._linkObject.buildLinkModeItems());
        }
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

    public getPosition(): JsonSchemaPositionDescription {
        return {x: this._position.x, y: this._position.y};
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

            // Do not replace the icon — the original schema/enum icon needs
            // to remain so users can tell what the link wraps.
            this._linkObject.setOnDelete(LinkTableOnDelete);
            this._linkObject.updateConnection();

            this._applyLinkReadOnly();
            this._applyLinkContextMenu();
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
     * Return the name of the linked object (empty if unresolved).
     * @return {string}
     */
    public getName(): string {
        return this._linkObject?.getName() ?? '';
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