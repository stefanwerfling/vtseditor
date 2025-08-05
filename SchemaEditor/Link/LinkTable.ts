import {SchemaTable} from '../Schema/SchemaTable.js';

/**
 * Link table
 */
export class LinkTable extends SchemaTable {

    /**
     * Link unid
     * @protected
     */
    protected _linkUnid: string;

    /**
     * constructor
     * @param {string} linkUnid
     */
    public constructor(linkUnid: string) {
        super('', '');
        this._linkUnid = linkUnid;

        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element']);
    }

    /**
     * Return the Link unid
     */
    public getLinkUnid(): string {
        return this._linkUnid;
    }

    /**
     * Set link unid
     * @param {string} unid
     */
    public setLinkUnid(unid: string): void {
        this._linkUnid = unid;
    }


}