import {JsonSchemaDescriptionExtendValue} from '../../JsonData.js';
import {ExtendType} from './ExtendType.js';

/**
 * Extend type group
 */
export class ExtendTypeGroup {

    /**
     * table unid
     * @protected
     */
    protected _tableUnid: string;

    /**
     * div builder
     * @protected
     */
    protected _divBuilder: HTMLDivElement;

    /**
     * div header
     * @protected
     */
    protected _divHeader: HTMLDivElement;

    /**
     * button add
     * @protected
     */
    protected _buttonAdd: HTMLButtonElement;

    /**
     * Label info
     * @protected
     */
    protected _labelInfo: HTMLLabelElement;

    /**
     * div body
     * @protected
     */
    protected _divBody: HTMLDivElement;

    /**
     * div field list
     * @protected
     */
    protected _divFieldList: HTMLDivElement;

    /**
     * fields
     * @protected
     */
    protected _fields: Map<string, ExtendType> = new Map<string, ExtendType>();

    /**
     * Constructor
     * @param {tableUnid} tableUnid
     */
    public constructor(tableUnid: string) {
        this._tableUnid = tableUnid;

        this._divBuilder = document.createElement('div');
        this._divBuilder.classList.add('multitype-wrapper');

        // header ------------------------------------------------------------------------------------------------------

        this._divHeader = document.createElement('div');
        this._divHeader.classList.add('multitype-header');
        this._divBuilder.appendChild(this._divHeader);

        // add button --------------------------------------------------------------------------------------------------

        const grpAction = document.createElement('div');
        grpAction.classList.add(...['multitype-btn-group', 'multitype-pull-right']);
        this._divHeader.appendChild(grpAction);

        this._buttonAdd = document.createElement('button');
        this._buttonAdd.type = 'button';
        this._buttonAdd.classList.add(...['multitype-btn', 'multitype-btn-xs', 'multitype-btn-success']);
        this._buttonAdd.append('➕ Add Type');

        this._buttonAdd.addEventListener('click', () => {
            this.addField();
        });

        grpAction.appendChild(this._buttonAdd);

        // or/single info ----------------------------------------------------------------------------------------------

        const grpCond = document.createElement('div');
        grpCond.classList.add(...['multitype-btn-group', 'multitype-group-conditions']);
        this._divHeader.appendChild(grpCond);

        this._labelInfo = document.createElement('label');
        this._labelInfo.classList.add(...['multitype-btn', 'multitype-btn-xs', 'multitype-label-primary', 'active']);
        this._labelInfo.textContent = 'SINGLE';
        grpCond.appendChild(this._labelInfo);

        // Body --------------------------------------------------------------------------------------------------------

        this._divBody = document.createElement('div');
        this._divBody.classList.add(...['multitype-body']);
        this._divBuilder.appendChild(this._divBody);

        this._divFieldList = document.createElement('div');
        this._divFieldList.classList.add('multitype-fieldlist');
        this._divBody.appendChild(this._divFieldList);
    }

    /**
     * Return the main element
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._divBuilder;
    }

    /**
     * Update label info
     * @protected
     */
    protected _updateLabelInfo(): void {
        if (this._fields.size <= 1) {
            this._labelInfo.textContent = 'SINGLE';
        } else {
            this._labelInfo.textContent = 'OR';
        }
    }

    /**
     * Delete field
     * @param {string} unid
     */
    public deleteField(unid: string): void {
        const field = this._fields.get(unid);

        if (field) {
            field.destroy();
            this._fields.delete(unid);
        }
    }

    /**
     * Add field
     * @param {JsonSchemaDescriptionExtendValue|null} value
     */
    public addField(value: JsonSchemaDescriptionExtendValue|null = null): void {
        const field = new ExtendType(this._tableUnid, '', false);

        if (value !== null) {
            field.setValue(value);
        }

        field.setOnDelete(unid => {
            this.deleteField(unid);
        });

        this._divFieldList.appendChild(field.getElement());

        this._fields.set(field.getUnid(), field);
        this._updateLabelInfo();
    }

    /**
     * Return a list of FieldType
     * @return {JsonSchemaDescriptionExtendValue[]}
     */
    public getValues(): JsonSchemaDescriptionExtendValue[] {
        const list: JsonSchemaDescriptionExtendValue[] = [];

        for (const [, entry] of this._fields.entries()) {
            list.push(entry.getValue());
        }

        return list;
    }

    /**
     * Set type values by list. Replace semantics: every existing child field
     * is destroyed before the incoming values are added, so repeated calls
     * do not accumulate rows.
     * @param {JsonSchemaDescriptionExtendValue[]} values
     */
    public setValues(values: JsonSchemaDescriptionExtendValue[]): void {
        for (const field of this._fields.values()) {
            field.destroy();
        }

        this._fields.clear();

        for (const value of values) {
            this.addField(value);
        }

        this._updateLabelInfo();
    }

    /**
     * Dispose: destroy every child extend-type (releasing their selects'
     * document listeners) and detach our own builder from the DOM.
     */
    public destroy(): void {
        for (const field of this._fields.values()) {
            field.destroy();
        }

        this._fields.clear();
        this._divBuilder.remove();
    }
}